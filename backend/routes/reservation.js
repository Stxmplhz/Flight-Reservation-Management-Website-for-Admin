import express from "express";
import db from "../db.js";

const router = express.Router();

// ------------- Reservation -------------
/*
If Reservation Status === "Confirmed" when Creating or Updating Reservation:
    - Create Reservation row with Status = 'Confirmed'
    - Create Payment row with Status = 'Successful'
    - Create Passenger row immediately
    - Seat's availibity is 'No'

If Reservation Status === "Pending" when creating Reservation:
    - Create Reservation row with Status = 'Pending'
    - Create Payment row with Status = 'Pending'
    - Don't create Passenger until Payment is Successful
    - Seat's availibity is 'No'

If Reservation Status === "Pending" when Updating Reservation:
    - Delete the associated Passenger
    - Seat's availibity is 'No'

If Reservation Status == "Canceled" && Payment == "Successful"
    - Delete the associated Passenger (Not Payment due to Refund Case)
    - Seat's availibity is 'Yes'

If Reservation Status == "Canceled" && Payment != "Successful"
    - Delete the associated Passenger, and Payment
    - Seat's availibity is 'Yes'
*/

// Get reservations only for a specific flight (cleaner route)
router.get("/", async (req, res) => {
  try {
    const flightID = req.query.flightID;

    let query = `
      SELECT 
        r.ReservationID,
        r.UserID,
        r.FlightID,
        s.SeatNumber,
        r.Status,
        r.BookingDate,
        p.PaymentID,
        p.Amount,
        u.Username
      FROM Reservation r
      JOIN Seat s ON r.SeatID = s.SeatID
      LEFT JOIN Payment p ON p.ReservationID = r.ReservationID
      LEFT JOIN User u ON u.UserID = r.UserID
    `;

    const params = [];

    if (flightID) {
      query += " WHERE r.FlightID = ?";
      params.push(flightID);
    }

    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving reservations");
  }
});

// Create a new Reservation and Initial Payment
router.post("/", async (req, res) => {
  try {
    const {
      userID,
      flightID,
      seatNumber,
      status,
      bookingDate,
      passengerInfo
    } = req.body;

    if (!userID || !flightID || !seatNumber || !status || !bookingDate) {
      return res.status(400).send("Missing required fields");
    }

    // Check user
    const [userResult] = await db.query("SELECT * FROM User WHERE UserID = ?", [userID]);
    if (userResult.length === 0) return res.status(404).send("User not found");

    // Get seatID From seatNumber
    const [seatResult] = await db.query(
      "SELECT SeatID, SeatClass, Available FROM Seat WHERE SeatNumber = ? AND FlightID = ?",
      [seatNumber, flightID]
    );
    if (seatResult.length === 0) return res.status(404).send("Seat not found for this flight");

    const seatID = seatResult[0].SeatID;
    const seatClass = seatResult[0].SeatClass;
    const isAvailable = seatResult[0].Available === 'Yes';
    if (!isAvailable) return res.status(400).json("Seat is already reserved");

    // Pricing logic
    const [flightResult] = await db.query("SELECT Price FROM Flight WHERE FlightID = ?", [flightID]);
    if (flightResult.length === 0) return res.status(404).send("Flight not found");

    const basePrice = flightResult[0].Price;

    const [multiplierResult] = await db.query("SELECT Multiplier FROM SeatMultiplier WHERE SeatClass = ?", [seatClass]);
    if (multiplierResult.length === 0) return res.status(404).send("Seat multiplier not found");

    const multiplier = multiplierResult[0].Multiplier;
    const amount = basePrice * multiplier;

    // Create reservation
    const [resResult] = await db.query(
      "INSERT INTO Reservation (UserID, FlightID, SeatID, Status, BookingDate) VALUES (?, ?, ?, ?, ?)",
      [userID, flightID, seatID, status, bookingDate]
    );
    const reservationID = resResult.insertId;

    const paymentStatus = status === 'Confirmed' ? 'Successful' : 'Pending';

    await db.query(
      "INSERT INTO Payment (ReservationID, UserID, Amount, PaymentMethod, PaymentDate, Status) VALUES (?, ?, ?, ?, ?, ?)",
      [reservationID, userID, amount, null, null, paymentStatus]
    );

    await db.query("UPDATE Seat SET Available = 'No' WHERE SeatID = ?", [seatID]);

    if (status === 'Confirmed') {
      const {
        Firstname = null,
        Middlename = null,
        Lastname = null,
        Nationality = null,
        BirthDate = null,
        Address = null,
        PassportNumber = null
      } = passengerInfo || {};

      await db.query(
        `INSERT INTO Passenger (ReservationID, SeatID, Firstname, Middlename, Lastname, Nationality, BirthDate, Address, PassportNumber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reservationID, seatID, Firstname, Middlename, Lastname, Nationality, BirthDate, Address, PassportNumber]
      );
    }

    res.status(201).json({
      message: "Reservation created successfully",
      reservationID,
      seatID,
      amount
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Update Reservation
router.put("/:id", async (req, res) => {
  try {
    const reservationID = req.params.id;
    const {
      userID,
      flightID,
      seatNumber,
      status,
      bookingDate,
      passengerInfo
    } = req.body;

    if (!userID || !flightID || !seatNumber || !status || !bookingDate) {
      return res.status(400).send("Missing required fields");
    }

    // Load original reservation
    const [originalResult] = await db.query(
      "SELECT SeatID, Status, FlightID FROM Reservation WHERE ReservationID = ?",
      [reservationID]
    );
    if (originalResult.length === 0)
      return res.status(404).send("Reservation not found");

    const previousSeatID = originalResult[0].SeatID;
    const previousStatus = originalResult[0].Status;
    const previousFlightID = originalResult[0].FlightID;

    // Lookup new seat
    const [seatLookup] = await db.query(
      "SELECT SeatID, SeatClass, Available FROM Seat WHERE SeatNumber = ? AND FlightID = ?",
      [seatNumber, flightID]
    );
    const newSeatData = seatLookup[0];
    if (!newSeatData) return res.status(404).send("Seat not found for this flight");

    const newSeatID = newSeatData.SeatID;
    const seatClass = newSeatData.SeatClass;
    const isAvailable = newSeatData.Available === 'Yes';

    const isBookingDateOnly =
      +flightID === +previousFlightID &&
      +newSeatID === +previousSeatID &&
      status === previousStatus;

    if (isBookingDateOnly) {
      await db.query(
        "UPDATE Reservation SET BookingDate = ? WHERE ReservationID = ?",
        [bookingDate, reservationID]
      );
      return res.json({ message: "Booking date updated only" });
    }

    if (!isAvailable && newSeatID !== previousSeatID && status !== 'Canceled') {
      return res.status(400).json({ message: "Seat is already reserved" });
    }

    // Calculate amount
    const [[{ Price: basePrice }]] = await db.query(
      "SELECT Price FROM Flight WHERE FlightID = ?",
      [flightID]
    );
    const [[{ Multiplier: multiplier }]] = await db.query(
      "SELECT Multiplier FROM SeatMultiplier WHERE SeatClass = ?",
      [seatClass]
    );
    const amount = basePrice * multiplier;

    // Update reservation
    await db.query(
      "UPDATE Reservation SET UserID = ?, FlightID = ?, SeatID = ?, Status = ?, BookingDate = ? WHERE ReservationID = ?",
      [userID, flightID, newSeatID, status, bookingDate, reservationID]
    );

    // Update seat availability
    if (newSeatID !== previousSeatID) {
      await db.query("UPDATE Seat SET Available = 'Yes' WHERE SeatID = ?", [previousSeatID]);
    }
    if (status === 'Pending' || status === 'Confirmed') {
      await db.query("UPDATE Seat SET Available = 'No' WHERE SeatID = ?", [newSeatID]);
    } else if (status === 'Canceled') {
      await db.query("UPDATE Seat SET Available = 'Yes' WHERE SeatID = ?", [newSeatID]);
    }

    // Handle payment
    const [paymentCheck] = await db.query(
      "SELECT * FROM Payment WHERE ReservationID = ?",
      [reservationID]
    );
    const existingPaymentStatus = paymentCheck[0]?.Status || null;

    const finalPaymentStatus =
      existingPaymentStatus === 'Successful'
        ? 'Successful'
        : (status === 'Confirmed' ? 'Successful' : 'Pending');

    if (paymentCheck.length > 0) {
      await db.query(
        "UPDATE Payment SET UserID = ?, Amount = ?, Status = ? WHERE ReservationID = ?",
        [userID, amount, finalPaymentStatus, reservationID]
      );
    } else {
      await db.query(
        "INSERT INTO Payment (ReservationID, UserID, Amount, PaymentMethod, PaymentDate, Status) VALUES (?, ?, ?, ?, ?, ?)",
        [reservationID, userID, amount, null, null, finalPaymentStatus]
      );
    }

    // Handle passenger
    if (status === 'Confirmed') {
      const {
        Firstname = null,
        Middlename = null,
        Lastname = null,
        Nationality = null,
        BirthDate = null,
        Address = null,
        PassportNumber = null
      } = passengerInfo || {};

      const [existingPassenger] = await db.query(
        "SELECT * FROM Passenger WHERE ReservationID = ?",
        [reservationID]
      );

      if (existingPassenger.length > 0) {
        await db.query(
          `UPDATE Passenger SET SeatID = ?, Firstname = ?, Middlename = ?, Lastname = ?, Nationality = ?, BirthDate = ?, Address = ?, PassportNumber = ? WHERE ReservationID = ?`,
          [newSeatID, Firstname, Middlename, Lastname, Nationality, BirthDate, Address, PassportNumber, reservationID]
        );
      } else {
        await db.query(
          `INSERT INTO Passenger (ReservationID, SeatID, Firstname, Middlename, Lastname, Nationality, BirthDate, Address, PassportNumber)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [reservationID, newSeatID, Firstname, Middlename, Lastname, Nationality, BirthDate, Address, PassportNumber]
        );
      }
    } else {
      await db.query("DELETE FROM Passenger WHERE ReservationID = ?", [reservationID]);
      if (status === 'Canceled' && existingPaymentStatus !== 'Successful') {
        await db.query("DELETE FROM Payment WHERE ReservationID = ?", [reservationID]);
      }
    }

    res.json({ message: "Reservation updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error on update");
  }
});


// Delete Reservation (Only allowed if Payment != Successful || Status != Confirmed)
router.delete("/:id", async (req, res) => {
  try {
    const reservationID = req.params.id;

    const [resResult] = await db.query("SELECT * FROM Reservation WHERE ReservationID = ?", [reservationID]);
    if (resResult.length === 0) return res.status(404).send("Reservation not found");

    const reservation = resResult[0];

    const [paymentResult] = await db.query("SELECT * FROM Payment WHERE ReservationID = ?", [reservationID]);
    const payment = paymentResult[0];

    if ((payment && payment.Status === 'Successful') || reservation.Status === 'Confirmed') {
      return res.status(400).send("Cannot delete reservation with successful payment or confirmed status. Please cancel instead.");
    }

    // Set Seat back to Available = 'Yes'
    await db.query("UPDATE Seat SET Available = 'Yes' WHERE SeatID = ?", [reservation.SeatID]);

    // Delete dependent data
    await db.query("DELETE FROM Passenger WHERE ReservationID = ?", [reservationID]);
    await db.query("DELETE FROM Payment WHERE ReservationID = ?", [reservationID]);
    await db.query("DELETE FROM Reservation WHERE ReservationID = ?", [reservationID]);

    res.json({ message: "Reservation and related data deleted. Seat set to available." });

  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});

// Get valid reservations for creating passenger (Status is Confirmed and no passenger yet)
router.get("/valid", async (req, res) => {
  const flightID = req.query.flightID;
  if (!flightID) return res.status(400).send("Missing flightID");

  try {
    const [rows] = await db.query(`
      SELECT 
        r.ReservationID AS reservationId,
        s.SeatNumber AS seatNumber,
        s.SeatID AS seatId
      FROM Reservation r
      JOIN Seat s ON r.SeatID = s.SeatID
      LEFT JOIN Passenger p ON r.ReservationID = p.ReservationID
      WHERE r.FlightID = ? AND r.Status = 'Confirmed' AND p.ReservationID IS NULL
    `, [flightID]);

    res.json(rows);
  } catch (err) {
    console.error("Failed to load valid reservations:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get Seat Avalaible for Flight
router.get('/seat/available', async (req, res) => {
  const { flightID } = req.query;
  const [seats] = await db.query(
    `SELECT SeatNumber AS SeatNumber FROM Seat WHERE FlightID = ? AND Available = 'Yes'`,
    [flightID]
  );
  res.json(seats);
});

export default router;