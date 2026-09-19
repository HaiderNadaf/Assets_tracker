"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VendorForm from "@/components/VendorForm";

export default function NewVendorClient() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back to vendors
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">Add vendor</h2>
          <p className="text-xs text-zinc-500">
            Shows up as a pick on the PO form&rsquo;s Supplier section from now on.
          </p>
        </div>
      </div>

      <VendorForm />
    </div>
  );
}
