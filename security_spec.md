# Security Specification for JCargo CMS

## Data Invariants
1.  **Identity Integrity**: A user can only access the system if they have a profile in the `users` collection with a valid role.
2.  **MAWB Lifecycle**: Only 'operation' and 'admin' roles can advance MAWB steps.
3.  **Financial Isolation**: Only 'finance' and 'admin' roles can see/modify invoices and customer credit levels.
4.  **Pricing Security**: Only 'business' and 'admin' roles can modify flight rates and quotes.
5.  **Immutability**: `createdAt` and `ownerId` (or equivalent) must not be changed after creation.
6.  **Relational Consistency**: An invoice cannot exist without a valid MAWB ID.

## The Dirty Dozen Payloads (Rejection Targets)
1.  **Identity Theft**: Attempting to create a user profile with `role: 'admin'` as a non-authenticated user.
2.  **Privilege Escalation**: A 'business' user attempting to update their own role to 'admin'.
3.  **Financial Leak**: An 'operation' user attempting to read the `finance` module's invoices.
4.  **Price Sabotage**: A 'customer' (if they ever get access) or 'operation' user attempting to lower `flight_rates`.
5.  **Status Shortcut**: Skipping operation steps directly in the MAWB document without an operation log entry (though here they are separate, we ensure who can write to them).
6.  **Ghost Field Injection**: Adding `isVerified: true` to a customer record.
7.  **Resource Poisoning**: Injecting a 2MB string into `flightNo`.
8.  **Orphaned Invoice**: Creating an invoice without a corresponding MAWB or customer.
9.  **Terminal State Bypass**: Updating a `closed` MAWB.
10. **Timestamp Spoofing**: Setting `createdAt` to a date in the past.
11. **Balance Manipulation**: Manually updating `currentBalance` in Customer without a corresponding finance permission.
12. **Blind List Access**: Querying all users without a filter, or querying another user's private data.

## Test Runner (Planned)
We will verify that:
- `users`: read only by self or admin.
- `customers`: read by business/finance/admin. Write by business/admin.
- `mawbs`: read by all staff. Write by business (create) and operation (update status).
- `invoices`: read/write by finance/admin.
- `flight-rates`: read by business. Write by manager.
