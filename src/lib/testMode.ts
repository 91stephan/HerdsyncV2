/**
 * Dev/test mode helpers.
 * Active when running via `vite dev` OR when VITE_ENABLE_DEV_TOOLS=true is set.
 * Never compiled into production bundles that have VITE_ENABLE_DEV_TOOLS unset.
 */

export const isDevMode =
  import.meta.env.DEV === true ||
  import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

/** Generate a valid 15-digit ISO 11784 national ID for Lesotho (country code 426). */
export function generateTestNationalId(): string {
  const individual = Math.floor(Math.random() * 999_999_999_999)
    .toString()
    .padStart(12, "0");
  return `426${individual}`;
}

/** Known test-user email/password pairs created by seed-test-data edge function. */
export const TEST_ACCOUNTS = {
  system_admin:    { email: "testadmin@herdsync.ls",    password: "Test1234!" },
  center_manager:  { email: "testmanager@herdsync.ls",  password: "Test1234!" },
  district_officer:{ email: "testofficer@herdsync.ls",  password: "Test1234!" },
  veterinarian:    { email: "testvет@herdsync.ls",       password: "Test1234!" },
  field_worker:    { email: "testfield@herdsync.ls",     password: "Test1234!" },
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;
