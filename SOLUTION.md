# Poker Site Indexing and Monitoring Solution

This document outlines the proposed solution for building a tool to index and monitor poker sites and their games for the jungleverse project.

## 1. Project Overview

The jungleverse project is a Next.js application designed to index and rank poker games. It has a well-defined database schema (using Prisma) and a service layer for adding data to the database. The existing architecture is robust and can be easily extended to support the new requirements.

## 2. Proposed Solution

The proposed solution involves creating a new data fetching service that will be responsible for collecting data from the poker sites. This service will be designed to be extensible, allowing for the addition of new sites over time.

### 2.1. Data Fetching Service

- A new service will be created at `lib/poker-data-fetcher.ts`.
- This service will contain the logic for fetching data from the poker sites.
- Initially, the service will be implemented to fetch data from one or two sites to prove the concept.
- The service will be designed in a modular way, with each site having its own "connector" that knows how to fetch and parse data from that specific site. This will make it easy to add new sites in the future.
- We will likely use a combination of web scraping and APIs (where available) to collect the data.

### 2.2. API Integration

- A new API route will be created at `app/api/fetch-poker-data/route.ts`.
- This API route will trigger the data fetching service.
- This will allow for both manual and scheduled data fetching. For example, we could set up a cron job to call this API route on a regular basis to keep the data up-to-date.

### 2.3. Adding New Poker Sites

- A one-time script will be created to add the list of poker sites you provided to the database.
- This script will use the existing `createRoom` service to add the sites to the `PokerRoom` table.

## 3. Implementation Plan

The implementation will be carried out in the following phases:

1.  **Phase 1: Initial Setup**
    - Create the `lib/poker-data-fetcher.ts` file.
    - Create the `app/api/fetch-poker-data/route.ts` file.
    - Create a script to add the new poker sites to the database.

2.  **Phase 2: Data Fetching Implementation (Proof of Concept)**
    - Implement the data fetching logic for one or two poker sites (e.g., GGpoker and Pokerstars).
    - This will involve writing the "connectors" for these sites and the logic to parse the data.

3.  **Phase 3: Database Integration**
    - Integrate the data fetching service with the existing `lib/services` to store the fetched data in the database.
    - This will involve using the `createTournament` and `createCashGame` services.

4.  **Phase 4: Testing**
    - Write tests to ensure that the data is being fetched and stored correctly.
    - This will involve creating a new test file in the `tests` directory.

## 4. Next Steps

I will now begin the implementation of Phase 1. I will keep you updated on my progress.
