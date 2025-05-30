import { defineStore } from "pinia";
import axios from "axios";

export const useFlightStore = defineStore("flight", {
  state: () => ({
    flights: [],
    searchQuery: "",
    selectedFlightStatus: null,
  }),

  getters: {
    getAllFlights: (state) => state.flights,
    getFlightsByAirlineId: (state) => (airlineID) => {
      if (!airlineID) return [];
      const query = state.searchQuery.toLowerCase();
      const selectedStatus = state.selectedFlightStatus;

      return state.flights.filter((flight) => {
        const matchAirlineID = Number(flight.airlineID) === Number(airlineID);
        const matchQuery = !query || String(flight.flightID).includes(query);
        const matchStatus =
          !selectedStatus || selectedStatus === "all" || flight.flightStatus === selectedStatus;
        return matchAirlineID && matchQuery && matchStatus;
      });
    },
    getFlightByID: (state) => (flightID) => state.flights.find(f => +f.flightID === +flightID),
  },

  actions: {
    async loadFlights() {
      try {
        const res = await axios.get("/api/flight");

        this.flights = res.data.map((flight) => {
          let parsedStops = [];

          if (Array.isArray(flight.stopOvers)) {
            parsedStops = flight.stopOvers;
          } else if (typeof flight.stopOvers === "string") {
            parsedStops = flight.stopOvers.split(",").map((s) => s.trim());
          }

          return {
            ...flight,
            stopOvers: parsedStops,
          };
        });
      } catch (error) {
        console.error("Failed to fetch flights:", error);
      }
    },

    async addFlight(flightData) {
      try {
        await axios.post("/api/flight", {
          airlineID: flightData.airlineID,
          departure: flightData.departure.airport,
          departureDate: flightData.departure.date,
          departureTime: flightData.departure.time,
          destination: flightData.destination.airport,
          arrivalDate: flightData.destination.date,
          arrivalTime: flightData.destination.time,
          stopOvers: flightData.stopOvers,
          duration: Number(flightData.duration.time),
          aircraftID: flightData.aircraftID,
          status: capitalize(flightData.flightStatus),
          price: Number(flightData.flightPrice),
        });

        // Reload flights to get updated isSeatAvailable
        await this.loadFlights();
      } catch (error) {
        console.error("Failed to add flight:", error);
      }
    },

    async updateFlight(flightID, updatedFlight) {
      try {
        await axios.put(`/api/flight/${flightID}`, {
          departure: updatedFlight.departure.airport,
          departureDate: updatedFlight.departure.date,
          departureTime: updatedFlight.departure.time,
          destination: updatedFlight.destination.airport,
          arrivalDate: updatedFlight.destination.date,
          arrivalTime: updatedFlight.destination.time,
          stopOvers: updatedFlight.stopOvers,
          duration: Number(updatedFlight.duration.time),
          aircraftID: updatedFlight.aircraftID,
          status: capitalize(updatedFlight.flightStatus),
          price: Number(updatedFlight.flightPrice),
        });

        // Reload updated flight list to get fresh isSeatAvailable value
        await this.loadFlights();
      } catch (error) {
        console.error("Failed to update flight:", error);
      }
    },

    async deleteFlight(flightID) {
      try {
        await axios.delete(`/api/flight/${flightID}`);
        this.flights = this.flights.filter(f => f.flightID !== flightID);
      } catch (error) {
        console.error("Failed to delete flight:", error);
      }
    },

    setSearchQuery(query) {
      this.searchQuery = query.trim().toLowerCase();
    },

    setSelectedStatus(status) {
      this.selectedFlightStatus = status;
    },
  },
});

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
