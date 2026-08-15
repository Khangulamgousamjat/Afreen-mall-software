# Known Deferrals & Non-Goals for v1 — AFREEN MALL

The following items are explicitly documented as out of scope / simulated for v1:

1. **Real Hardware Drivers:**
   - Real serial/USB ESC-POS thermal printer hardware drivers and PineLabs EDC SDK are out of scope.
   - Decoupled hardware simulation layer implemented with text buffer generation, duplicate watermark tracking, and mock EDC/UPI flows.

2. **Biometric Attendance Hardware:**
   - Fingerprint/card hardware readers simulated via password verification and manual punch entry.

3. **Multi-Tenant SaaS Isolation:**
   - System is a staff-only single-tenant store application (with multi-branch/company fields); row-level multi-tenant DB isolation is not required for v1.

4. **Payroll Tax Engine:**
   - Statutory PF/ESIC/TDS slab deductions use flat/derived placeholder structures for v1.

5. **SMS/WhatsApp/Email Delivery for CRM:**
   - Campaign and notification delivery is logged and audited in the database rather than hooked up to external third-party messaging gateways.
