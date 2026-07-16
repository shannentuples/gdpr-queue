import { randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";

interface SeedDataSource {
  key: string;
  name: string;
  description: string;
}

interface SeedRecord {
  dataSourceKey: string;
  subjectName: string;
  subjectEmail: string;
  recordType: string;
  payload: Record<string, unknown>;
}

const DATA_SOURCES: SeedDataSource[] = [
  { key: "crm", name: "CRM", description: "Contact records, signup date, and marketing preferences." },
  { key: "support", name: "Support Desk", description: "Customer support tickets raised by the requester." },
  { key: "billing", name: "Billing System", description: "Invoices and payment records." },
];

const RECORDS: SeedRecord[] = [
  {
    dataSourceKey: "crm",
    subjectName: "Shan Altura",
    subjectEmail: "shanaltura@gmail.com",
    recordType: "contact",
    payload: { signupDate: "2023-02-14T10:00:00Z", marketingOptIn: true, tags: ["beta-user", "newsletter"] },
  },
  {
    dataSourceKey: "support",
    subjectName: "Shan Altura",
    subjectEmail: "shanaltura@gmail.com",
    recordType: "ticket",
    payload: { ticketId: "TCK-1001", subject: "Cannot reset password", status: "resolved", createdAt: "2023-05-03T14:22:00Z" },
  },
  {
    dataSourceKey: "support",
    subjectName: "Shan Altura",
    subjectEmail: "shanaltura@gmail.com",
    recordType: "ticket",
    payload: { ticketId: "TCK-1002", subject: "Feature request: dark mode", status: "closed", createdAt: "2024-01-11T08:05:00Z" },
  },
  {
    dataSourceKey: "billing",
    subjectName: "Shan Altura",
    subjectEmail: "shanaltura@gmail.com",
    recordType: "invoice",
    payload: { invoiceId: "INV-2024-0042", amount: 29.0, currency: "USD", issuedAt: "2024-03-01T00:00:00Z" },
  },
  {
    dataSourceKey: "crm",
    subjectName: "Jane Doe",
    subjectEmail: "jane.doe@example.com",
    recordType: "contact",
    payload: { signupDate: "2022-06-01T09:30:00Z", marketingOptIn: false, tags: ["enterprise"] },
  },
];

export function seedIfEmpty(db: Database): void {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM data_sources").get() as { count: number };
  if (count > 0) return;

  const now = new Date().toISOString();
  const insertSource = db.prepare(
    "INSERT INTO data_sources (id, name, description, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertRecord = db.prepare(
    `INSERT INTO found_records (id, data_source_id, subject_name, subject_email, record_type, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const seedTransaction = db.transaction(() => {
    const sourceIds = new Map<string, string>();
    for (const source of DATA_SOURCES) {
      const id = randomUUID();
      sourceIds.set(source.key, id);
      insertSource.run(id, source.name, source.description, now);
    }
    for (const record of RECORDS) {
      const dataSourceId = sourceIds.get(record.dataSourceKey);
      if (!dataSourceId) throw new Error(`Unknown seed data source key: ${record.dataSourceKey}`);
      insertRecord.run(
        randomUUID(),
        dataSourceId,
        record.subjectName,
        record.subjectEmail,
        record.recordType,
        JSON.stringify(record.payload),
        now
      );
    }
  });

  seedTransaction();
}
