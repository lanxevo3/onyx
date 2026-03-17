import Modal from "@/refresh-components/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndexAttemptError } from "./types";
import { localizeAndPrettify } from "@/lib/time";
import Button from "@/refresh-components/buttons/Button";
import Text from "@/refresh-components/texts/Text";
import { PageSelector } from "@/components/PageSelector";
import { useEffect, useRef, useState, useMemo } from "react";
import { SvgAlertTriangle } from "@opal/icons";
export interface IndexAttemptErrorsModalProps {
  errors: {
    items: IndexAttemptError[];
    total_items: number;
  };
  onClose: () => void;
  onResolveAll: () => void;
  isResolvingErrors?: boolean;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  pageSize?: number;
}

export default function IndexAttemptErrorsModal({
  errors,
  onClose,
  onResolveAll,
  isResolvingErrors = false,
  pageSize: propPageSize,
}: IndexAttemptErrorsModalProps) {
  const ROW_HEIGHT = 60;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [calculatedPageSize, setCalculatedPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [errors.items.length, errors.total_items]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const thead = container.querySelector("thead");
      const theadHeight = thead?.getBoundingClientRect().height ?? 0;
      const availableHeight = container.clientHeight - theadHeight;
      const rowsPerPage = Math.max(3, Math.floor(availableHeight / ROW_HEIGHT));
      setCalculatedPageSize((prev) =>
        prev !== rowsPerPage ? rowsPerPage : prev
      );
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [calculatedPageSize]);

  const pageSize = propPageSize || calculatedPageSize;

  // Memoize pagination calculations to prevent unnecessary recalculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(errors.items.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageItems = errors.items.slice(startIndex, endIndex);

    return {
      totalPages,
      currentPageItems,
      startIndex,
      endIndex,
    };
  }, [errors.items, pageSize, currentPage]);

  const hasUnresolvedErrors = useMemo(
    () => errors.items.some((error) => !error.is_resolved),
    [errors.items]
  );

  const handlePageChange = (page: number) => {
    // Ensure we don't go to an invalid page
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="lg" height="full">
        <Modal.Header
          icon={SvgAlertTriangle}
          title="Indexing Errors"
          description={
            isResolvingErrors
              ? "Currently attempting to resolve all errors by performing a full re-index. This may take some time to complete."
              : undefined
          }
          onClose={onClose}
          height="fit"
        />
        <Modal.Body>
          {!isResolvingErrors && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Text as="p">
                Below are the errors encountered during indexing. Each row
                represents a failed document or entity.
              </Text>
              <Text as="p">
                Click the button below to kick off a full re-index to try and
                resolve these errors. This full re-index may take much longer
                than a normal update.
              </Text>
            </div>
          )}

          <div
            ref={tableContainerRef}
            className="flex-1 overflow-hidden min-h-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Document ID</TableHead>
                  <TableHead className="w-1/2">Error Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginationData.currentPageItems.length > 0 ? (
                  paginationData.currentPageItems.map((error) => (
                    <TableRow key={error.id} className="h-[60px] max-h-[60px]">
                      <TableCell className="h-[60px] align-top">
                        {localizeAndPrettify(error.time_created)}
                      </TableCell>
                      <TableCell className="h-[60px] align-top">
                        {error.document_link ? (
                          <a
                            href={error.document_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link hover:underline"
                          >
                            {error.document_id || error.entity_id || "Unknown"}
                          </a>
                        ) : (
                          error.document_id || error.entity_id || "Unknown"
                        )}
                      </TableCell>
                      <TableCell className="h-[60px] align-top p-0">
                        <div className="h-[60px] overflow-y-auto p-4 whitespace-normal">
                          {error.failure_message}
                        </div>
                      </TableCell>
                      <TableCell className="h-[60px] align-top">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            error.is_resolved
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {error.is_resolved ? "Resolved" : "Unresolved"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      No errors found on this page
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {paginationData.totalPages > 1 && (
            <div className="flex-1 flex w-full justify-center">
              <PageSelector
                totalPages={paginationData.totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {hasUnresolvedErrors && !isResolvingErrors && (
            // TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved
            <Button onClick={onResolveAll} className="ml-4 whitespace-nowrap">
              Resolve All
            </Button>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
