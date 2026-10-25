# ADR-0009: Paid events show price; organizer collects payment in MVP

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (decision card, option "Price shown, organizer collects")

## Context
Events may be free (sunrise hike) or paid (clubbing night). Collecting money in the app means a payment gateway with marketplace payouts, organizer KYC, refunds, GST handling and chargebacks, plus legal review. Cards issued in some countries (for example Iran, due to sanctions) cannot be charged by Indian gateways at all.

## Options considered
1. **Price shown, organizer collects** via their own UPI or payment link, or at the door.
2. **In-app payments** with Razorpay Route (split payouts to organizers).
3. **Free events only.**

## Decision
Option 1.
- An event has a `pricing_type` (free or paid), price, currency (INR), and an optional organizer payment link or note.
- RSVP to a paid event creates a registration with `payment_status = pending`. The organizer marks it `paid` (or the attendee shows proof at the door). Capacity counts confirmed registrations.
- The app states clearly that Vibers Club does not handle payment or refunds for these events.

## Consequences
- No payment liability before funding; the pitch demo still shows paid events, tickets and capacity.
- Registrations and payment status are modelled so Razorpay can be added in phase 2 without changing the schema's shape.
- Fraud risk (fake paid events) is handled by the reporting and host limits in ADR-0008.

## Revisit when
Organizers ask for collection, or no-shows on paid events become a problem.
