Airline Disruption Supply Chain Manager – Architecture
Overview

Airline disruptions caused by weather, airport congestion, crew constraints, or technical failures often trigger cascading operational and customer-experience issues. Decisions are usually made across siloed systems, resulting in slow recovery, inconsistent passenger handling, and high operational cost.

This project proposes a real-time, event-driven decision system that continuously ingests live operational data, evaluates disruption impact, prioritizes affected passengers, and recommends recovery actions using a combination of streaming intelligence and constrained AI reasoning.

The system is designed to be enterprise-ready, auditable, and explainable, with a strong focus on real-time decision-making rather than batch analytics.

Core Objectives

Detect and assess airline disruptions as they unfold

Quantify operational pressure and passenger impact in real time

Prioritize passengers based on business and customer-care rules

Generate validated recovery actions within policy and cost guardrails

Provide transparent, auditable AI-assisted decisions for operations teams

Data in Motion (Confluent Platform)
Input Event Streams

The platform consumes continuously flowing operational data via Confluent Cloud:

flight_ops.events.v1
Real-time flight status updates including delays, cancellations, diversions, and airport disruptions.

booking.events.v1
Passenger booking data such as PNRs, itineraries, loyalty tier, special assistance needs, and connection details.

inventory.events.v1
Live seat availability, aircraft capacity, and rebooking options.

These streams represent the airline’s operational reality as it changes minute-by-minute.

Stream Intelligence Layer (ksqlDB)

ksqlDB processes the incoming streams to derive actionable intelligence in real time:

Windowed joins across flight, booking, and inventory events

Aggregations to calculate disruption severity and passenger impact

Scoring logic to identify high-risk connections and bottlenecks

Passenger cohorting based on priority rules and service commitments

This layer produces enriched, decision-ready streams without relying on batch processing.

Derived Streams

disruption.state.v1
Represents the current operational pressure for a disruption zone, including severity level, impacted passengers, and key performance indicators.

passenger.cohorts.v1
Groups affected passengers into priority cohorts (for example: critical assistance, premium loyalty, tight connections, standard).

These streams act as the single source of truth for downstream decision-making.

Recovery Orchestrator (Google Cloud Run)

The Recovery Orchestrator is a stateless service that consumes the derived streams and determines the appropriate response.

Its responsibilities include:

Applying deterministic business guardrails (policy, safety, cost limits)

Selecting applicable recovery tools (rebooking, hotel offers, refunds, escalation, charter requests)

Calling Vertex AI Gemini to generate structured recovery plans and communication content

Validating all AI outputs before emitting actions

The orchestrator ensures AI is used as a decision assistant, not an uncontrolled decision maker.

AI Decision Layer (Vertex AI Gemini)

Gemini is used selectively for tasks that benefit from reasoning and language understanding:

Generating structured recovery plans in a predefined JSON format

Producing passenger-friendly communication messages aligned with policy

Summarizing incidents for operations and leadership visibility

All AI interactions are constrained, logged, and explainable.

Output Streams and Auditability

recovery.actions.v1
Contains validated recovery actions such as rebookings, hotel offers, refunds, escalations, or charter requests.

agent.audit.v1
Captures the full decision trace including inputs, guardrails applied, AI reasoning metadata, and latency.

This design enables compliance, post-incident analysis, and continuous improvement.

User Interface and Analytics

A lightweight operations dashboard provides:

Live disruption feed

Passenger cohort visibility

Recommended action queues

Decision audit trails

Historical data may optionally be persisted in BigQuery for reporting and analytics.

Key Differentiators

Real-time AI applied to streaming data, not static datasets

Clear separation of deterministic logic and AI reasoning

Full auditability and explainability of decisions

Architecture aligned with enterprise operational workflows