"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export function PaginationControls({ page, pages, searchParams }: PaginationControlsProps) {
  if (pages <= 1) return null;

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== "page" && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    if (pageNum > 1) {
      params.set("page", pageNum.toString());
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <Link key={1} href={createPageUrl(1)}>
          <Button variant={page === 1 ? "default" : "outline"} size="sm">
            1
          </Button>
        </Link>
      );
      if (startPage > 2) {
        pageNumbers.push(
          <span key="ellipsis-start" className="px-2">
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Link key={i} href={createPageUrl(i)}>
          <Button variant={page === i ? "default" : "outline"} size="sm">
            {i}
          </Button>
        </Link>
      );
    }

    if (endPage < pages) {
      if (endPage < pages - 1) {
        pageNumbers.push(
          <span key="ellipsis-end" className="px-2">
            ...
          </span>
        );
      }
      pageNumbers.push(
        <Link key={pages} href={createPageUrl(pages)}>
          <Button variant={page === pages ? "default" : "outline"} size="sm">
            {pages}
          </Button>
        </Link>
      );
    }

    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Link href={createPageUrl(Math.max(1, page - 1))}>
        <Button variant="outline" size="sm" disabled={page <= 1}>
          Previous
        </Button>
      </Link>
      {renderPageNumbers()}
      <Link href={createPageUrl(Math.min(pages, page + 1))}>
        <Button variant="outline" size="sm" disabled={page >= pages}>
          Next
        </Button>
      </Link>
    </div>
  );
}
