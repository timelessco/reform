import { db } from "@/db";

export const getTxId = () =>
	db.execute<{ txid: number }>(
		"SELECT pg_current_xact_id()::xid::text::int as txid",
	);
