# ADR-0002: Native mobile app built with React Native and Expo

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (chose "app" over mobile web)

## Context
The product owner wants a store-installable app. Travellers use phones on the move, need push notifications for event reminders and connection requests, and the product must be strong enough to pitch to investors.

## Options considered
1. **Mobile-first web app (PWA).** Fastest to ship, no store review. Weak push notifications on iOS, feels less like an app in a pitch.
2. **React Native with Expo (TypeScript).** One codebase for Android and iOS, real push notifications, camera and maps. Expo's build service (EAS) handles store builds without owning a Mac. Larger ecosystem than Flutter for hiring.
3. **Flutter.** Comparable capability, but Dart is a third language for the team.
4. **Separate native apps (Kotlin and Swift).** Two codebases; not viable for this team size.

## Decision
Option 2: React Native with Expo, TypeScript, Expo Router for navigation.

A small web surface is still needed and will be built later with Next.js: a moderation/admin console and public share pages for events (so a WhatsApp link to an event opens something useful before install). That web surface is out of scope until the app's core loop works.

## Consequences
- Android first for testing (cheaper and faster review), iOS alongside before public launch.
- Apple requires "Sign in with Apple" when an app offers other third-party sign-in (see ADR-0005).
- Store accounts are needed: Google Play (one-time fee) and Apple Developer Program (annual fee). Store review adds days to each release; Expo's over-the-air updates cover JavaScript-only fixes.
- The API client is generated from FastAPI's OpenAPI spec so the app and backend share types.

## Revisit when
Store review or Expo limitations block a core feature.
