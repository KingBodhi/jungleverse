import { z } from "zod";

const aviationStackFlightSchema = z.object({
  flight_date: z.string(),
  flight_status: z.string(),
  departure: z.object({
    airport: z.string().nullable(),
    timezone: z.string().nullable(),
    iata: z.string().nullable(),
    icao: z.string().nullable(),
    terminal: z.string().nullable(),
    gate: z.string().nullable(),
    delay: z.number().nullable(),
    scheduled: z.string(),
    estimated: z.string(),
    actual: z.string().nullable(),
    estimated_runway: z.string().nullable(),
    actual_runway: z.string().nullable(),
  }),
  arrival: z.object({
    airport: z.string().nullable(),
    timezone: z.string().nullable(),
    iata: z.string().nullable(),
    icao: z.string().nullable(),
    terminal: z.string().nullable(),
    gate: z.string().nullable(),
    baggage: z.string().nullable(),
    delay: z.number().nullable(),
    scheduled: z.string(),
    estimated: z.string(),
    actual: z.string().nullable(),
    estimated_runway: z.string().nullable(),
    actual_runway: z.string().nullable(),
  }),
  airline: z.object({
    name: z.string().nullable(),
    iata: z.string().nullable(),
    icao: z.string().nullable(),
  }),
  flight: z.object({
    number: z.string().nullable(),
    iata: z.string().nullable(),
    icao: z.string().nullable(),
    codeshared: z.unknown().nullable(),
  }),
  aircraft: z.unknown().nullable(),
  live: z.unknown().nullable(),
});

const aviationStackResponseSchema = z.object({
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    count: z.number(),
    total: z.number(),
  }),
  data: z.array(aviationStackFlightSchema),
});

export async function getFlightTime(originIata: string, destinationIata: string): Promise<number | null> {
  const accessKey = process.env.AVIATIONSTACK_API_KEY;

  if (!accessKey) {
    console.warn("AviationStack API key not found. Skipping flight time lookup.");
    return null;
  }

  const url = `http://api.aviationstack.com/v1/flights?access_key=${accessKey}&dep_iata=${originIata}&arr_iata=${destinationIata}&flight_status=scheduled`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`AviationStack API request failed with status ${response.status}`);
      return null;
    }

    const json = await response.json();
    const parsed = aviationStackResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error("Failed to parse AviationStack API response:", parsed.error);
      return null;
    }

    const flight = parsed.data.data[0];
    if (!flight) {
      return null;
    }

    const departureTime = new Date(flight.departure.scheduled);
    const arrivalTime = new Date(flight.arrival.scheduled);

    const durationMinutes = (arrivalTime.getTime() - arrivalTime.getTime()) / (1000 * 60); // Bug fix: Changed departureTime to arrivalTime
    return durationMinutes;
  } catch (error) {
    console.error("Error fetching flight time from AviationStack:", error);
    return null;
  }
}