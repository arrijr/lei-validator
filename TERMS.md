# Terms of Service — LEI Validator Pro

**Last updated:** 2026-04-20
**Provider:** Arthur Richelhof (arrijr)
**Contact:** richelhofarthur@gmail.com

---

## 1. Acceptance

By subscribing to or using the LEI Validator Pro API ("the Service") via RapidAPI, you agree to these Terms. If you do not agree, do not use the Service.

## 2. Service description

The Service validates Legal Entity Identifier (LEI) numbers against the GLEIF (Global Legal Entity Identifier Foundation) registry. It returns validity status, entity status, renewal date, and where available, company name, country, jurisdiction, legal form, and registered addresses. Validation results are cached for up to 24 hours for valid responses and 1 hour for invalid responses.

## 3. No financial, legal, or compliance advice

**Results are provided for informational purposes only and do not constitute financial, legal, regulatory, or compliance advice.** You are solely responsible for verifying LEI status with the issuing Local Operating Unit (LOU) or GLEIF before executing trades, filing regulatory reports, or making any commercial decision based on LEI data. The Service is not a substitute for consulting a licensed financial, legal, or compliance professional.

## 4. Data accuracy and upstream dependencies

LEI data is retrieved from the GLEIF REST API, a public registry operated by the Global Legal Entity Identifier Foundation. GLEIF data may have propagation delays following updates by Local Operating Units. No representation is made that data is current or correct at every moment. The `verified_at` and `cached` fields in each response indicate when a result was last fetched from the upstream source. A `valid: true` result means the LEI was recognised by GLEIF at the time of verification — it does not imply the entity is in good standing, not sanctioned, or authorised to conduct a specific transaction.

## 5. MiFID II / EMIR / KYB disclaimer

Although LEI validation is a component of MiFID II, EMIR, and KYB workflows, this Service **is not a complete compliance solution**. Regulatory obligations may require additional checks (sanctions screening, beneficial ownership verification, etc.) beyond what this Service provides. You remain solely responsible for meeting your regulatory obligations.

## 6. Not a sanctions, AML, or KYC check

The Service is **not** a sanctions screening, anti-money-laundering, or know-your-customer tool. You must not rely on it for sanctions clearance, beneficial-ownership verification, or any regulated compliance obligation. Use a dedicated, licensed provider for those purposes.

## 7. Acceptable use

You agree not to:
- Reverse-engineer, scrape, or attempt to access the Service outside the RapidAPI gateway.
- Resell, redistribute, or republish the underlying GLEIF dataset as a competing service.
- Use the Service to harass, profile, or discriminate against legal entities.
- Use the Service for any unlawful purpose.
- Exceed published rate limits or circumvent authentication.

Violation may result in immediate termination without refund.

## 8. Service availability

We target high availability but make no uptime guarantees beyond those in your RapidAPI subscription plan. Planned maintenance, force majeure, or — in particular — unavailability of the GLEIF API endpoint may cause interruptions. During upstream outages the Service may return cached results or `503 SERVICE_UNAVAILABLE`.

## 9. Disclaimer of warranties

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.

## 10. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE PROVIDER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE — EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. AGGREGATE LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.

## 11. Indemnification

You agree to indemnify and hold harmless the provider from any claim arising out of your use of the Service, including claims related to trades executed, regulatory filings, compliance decisions, or any other action taken based on data retrieved from this Service.

## 12. Termination

Either party may terminate at any time via RapidAPI's cancellation flow. These Terms survive termination with respect to sections 3, 5, 6, 9, 10, and 11.

## 13. Governing law

These Terms are governed by the laws of Germany. Disputes shall be resolved in the courts of Germany.

## 14. Changes

We may update these Terms. Continued use after an update constitutes acceptance.

## Contact

Arthur Richelhof — richelhofarthur@gmail.com
