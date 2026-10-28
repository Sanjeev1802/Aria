"use client";

import { ArrowRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type User = { id: string; email: string; name: string; status: "active" | "disabled" };

export function InternalCustomerPreviewTable({
  users,
  query,
  setQuery,
  status,
  setStatus,
  openCustomer,
  title,
  totalLoaded,
  viewAll,
}: {
  users: User[];
  query: string;
  setQuery: (value: string) => void;
  status: "all" | User["status"];
  setStatus: (value: "all" | User["status"]) => void;
  openCustomer: (id: string) => void;
  title: string;
  totalLoaded: number;
  viewAll?: () => void;
}) {
  return (
    <section className="internal-panel internal-customers internal-customers--embedded overflow-hidden border-0 bg-transparent shadow-none">
      <div className="internal-panel-heading flex items-center justify-between border-b">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {users.length} of {totalLoaded} accounts shown
          </p>
        </div>
        {viewAll ? (
          <button type="button" className="internal-view-all flex items-center gap-1 text-sm" onClick={viewAll}>
            View all
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="internal-filter-row">
        <label className="internal-table-toolbar">
          <Search size={17} aria-hidden />
          <input
            aria-label="Search customers"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search name, email, or user ID"
          />
        </label>
        <label className="internal-filter-select">
          Status{" "}
          <select
            aria-label="Filter customers by status"
            value={status}
            onChange={event => setStatus(event.target.value as "all" | User["status"])}
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>
      <div className="internal-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Account status</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead aria-label="Open" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="internal-customer-cell flex items-center gap-2">
                    <span className="internal-avatar small">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
                    <div>
                      <button type="button" className="internal-customer-open" onClick={() => void openCustomer(user.id)}>
                        {user.name || user.email}
                      </button>
                      <small className="block">{user.email}</small>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`internal-pill ${user.status}`}>{user.status}</span>
                </TableCell>
                <TableCell className="internal-id">{user.id}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="internal-row-open"
                    aria-label={`Open ${user.name || user.email}`}
                    onClick={() => void openCustomer(user.id)}
                  >
                    <ArrowRight size={17} aria-hidden />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 ? <div className="internal-empty p-6">No customers match these filters.</div> : null}
      </div>
    </section>
  );
}
