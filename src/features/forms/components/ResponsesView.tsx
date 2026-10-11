"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { SkeletonRegion } from "@/components/ui/skeleton";
import { ResponseDetailLoading, ResponseListSkeleton } from "./FormLoading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiErrorMessage } from "@/lib/http/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { AdminBackLink } from "./AdminBackLink";
import { formatDetailedDateTime, formatShortDateTime } from "@/lib/utils/date";
import {
  ArrowRightIcon,
  CheckIcon,
  EditIcon,
  ViewIcon,
} from "@/components/ui/icons";
import {
  fetchSubmissionDetail,
  fetchFormSubmissions,
  type SubmissionListItem,
  type SubmissionDetail,
} from "../client/responses-api";
import { evaluateQuestionVisibility } from "@/features/patients/domain/visibility";
import type { Question } from "@/features/forms/domain/types";
import type { PatientAnswers } from "@/features/patients/domain/types";

const PAGE_SIZE = 50;

interface ResponsesViewProps {
  formId: string;
  formName: string;
  initialSubmissions: SubmissionListItem[];
  initialError?: string | null;
  initialTotalCount?: number;
}

export function ResponsesView({
  formId,
  formName,
  initialSubmissions,
  initialError = null,
  initialTotalCount,
}: ResponsesViewProps) {
  const [submissions, setSubmissions] =
    useState<SubmissionListItem[]>(initialSubmissions);
  const [totalCount, setTotalCount] = useState<number>(
    initialTotalCount ?? initialSubmissions.length,
  );
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [listError, setListError] = useState(initialError);
  const [loadingList, setLoadingList] = useState(false);
  const listBusy = useRef(false);
  const listRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      detailRequest.current?.abort();
      listRequest.current?.abort();
    },
    [],
  );

  const loadPage = async (pageIndex: number) => {
    if (listBusy.current) return;
    listBusy.current = true;
    const controller = new AbortController();
    listRequest.current = controller;
    setLoadingList(true);
    setListError(null);
    try {
      const next = await fetchFormSubmissions(formId, {
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSubmissions(next.submissions);
        setTotalCount(next.totalCount);
        setCurrentPage(pageIndex);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setListError(
          apiErrorMessage(error, APP_MESSAGES.RESPONSES_LOAD_FAILED),
        );
    } finally {
      listBusy.current = false;
      if (!controller.signal.aborted) setLoadingList(false);
    }
  };

  const handleRefresh = async () => {
    await loadPage(currentPage);
  };
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [selectedDetail, setSelectedDetail] = useState<SubmissionDetail | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selectedSubmissionId && detailTrigger.current) {
      detailTrigger.current.focus();
      detailTrigger.current = null;
    }
  }, [selectedSubmissionId]);

  const handleOpenDetail = async (submissionId: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedDetail(null);
    setSelectedSubmissionId(submissionId);
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const detail = await fetchSubmissionDetail(
        formId,
        submissionId,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSelectedDetail(detail);
    } catch (error) {
      if (!controller.signal.aborted)
        setDetailError(apiErrorMessage(error, APP_MESSAGES.DETAIL_LOAD_FAILED));
    } finally {
      if (!controller.signal.aborted) setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    detailRequest.current?.abort();
    setLoadingDetail(false);
    setSelectedSubmissionId(null);
    setSelectedDetail(null);
    setDetailError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Top Header */}
      <header className="h-14 border-b border-gray-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <AdminBackLink />

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {formName}
            </h1>
            <Badge tone="mono" className="text-gray-500">
              Responses ({totalCount})
            </Badge>
          </div>
        </div>

        {/* Navigation tabs between Editor and Responses */}
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.editForm(formId)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>Editor</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Banner / Stat summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Clinical Intake Submissions
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Authoritative, immutable patient intake records submitted against
              published form versions.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Badge tone="success" className="py-1 text-xs font-medium">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              {totalCount} Completed{" "}
              {totalCount === 1 ? "Response" : "Responses"}
            </Badge>
          </div>
          <Button
            variant="secondary"
            loading={loadingList}
            loadingLabel={APP_MESSAGES.LOADING_RESPONSES}
            onClick={() => void handleRefresh()}
          >
            {listError ? APP_MESSAGES.RETRY : APP_MESSAGES.REFRESH_RESPONSES}
          </Button>
        </div>

        {listError && <Alert>{listError}</Alert>}

        {loadingList && submissions.length === 0 && (
          <SkeletonRegion label={APP_MESSAGES.LOADING_RESPONSES}>
            <ResponseListSkeleton />
          </SkeletonRegion>
        )}

        {/* Responses Table / List */}
        {submissions.length === 0 ? (
          !listError &&
          !loadingList && (
            /* Empty State */
            <div
              data-testid="empty-responses-state"
              className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
                <ViewIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                No Responses Yet
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Patient submissions will appear here automatically once clinical
                intake forms are completed.
              </p>
              <div className="pt-2">
                <Link
                  href={ROUTES.editForm(formId)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  <span>Open Editor</span>
                </Link>
              </div>
            </div>
          )
        ) : (
          /* Table of Responses */
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table aria-label="Clinical Form Responses">
                <Thead className="bg-gray-50 text-micro font-semibold">
                  <Tr className="hover:bg-transparent">
                    <Th scope="col" className="px-5 py-3">
                      Submission Date
                    </Th>
                    <Th scope="col" className="px-5 py-3">
                      Form Name
                    </Th>
                    <Th scope="col" className="px-5 py-3">
                      Version
                    </Th>
                    <Th scope="col" className="px-5 py-3">
                      Status
                    </Th>
                    <Th scope="col" className="px-5 py-3">
                      Session Ref
                    </Th>
                    <Th scope="col" className="px-5 py-3 text-right">
                      Actions
                    </Th>
                  </Tr>
                </Thead>
                <Tbody className="text-gray-800">
                  {submissions.map((sub) => (
                    <Tr
                      key={sub.id}
                      className="hover:bg-blue-50/40 cursor-pointer"
                      onClick={(event) => {
                        detailTrigger.current =
                          event.currentTarget.querySelector("button");
                        void handleOpenDetail(sub.id);
                      }}
                    >
                      <Td className="px-5 font-medium text-gray-900">
                        {formatDetailedDateTime(sub.submittedAt)}
                      </Td>
                      <Td className="px-5 font-medium truncate max-w-xs text-gray-900">
                        {sub.formName || formName}
                      </Td>
                      <Td className="px-5">
                        <Badge tone="neutral" className="px-2">
                          v{sub.versionNumber}
                        </Badge>
                      </Td>
                      <Td className="px-5">
                        <Badge tone="success" className="px-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Completed
                        </Badge>
                      </Td>
                      <Td className="px-5 font-mono text-gray-500">
                        {sub.sessionReference}
                      </Td>
                      <Td className="px-5 text-right">
                        <Button
                          loading={
                            loadingDetail && selectedSubmissionId === sub.id
                          }
                          loadingLabel={APP_MESSAGES.LOADING}
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            detailTrigger.current = e.currentTarget;
                            void handleOpenDetail(sub.id);
                          }}
                          className="text-xs px-2.5 py-1 text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        >
                          <span>View Detail</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
                <span>
                  Showing {currentPage * PAGE_SIZE + 1}–
                  {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount} responses
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={currentPage === 0 || loadingList}
                    onClick={() => void loadPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-2 font-medium">
                    Page {currentPage + 1} of{" "}
                    {Math.ceil(totalCount / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={
                      (currentPage + 1) * PAGE_SIZE >= totalCount || loadingList
                    }
                    onClick={() => void loadPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Submission Detail Modal */}
      {selectedSubmissionId && (
        <Dialog
          open={Boolean(selectedSubmissionId)}
          onClose={handleCloseDetail}
          titleId="submission-detail-title"
          className="max-w-2xl w-full p-0 overflow-hidden rounded-2xl shadow-2xl border border-gray-200 bg-white"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <DialogHeader
              titleId="submission-detail-title"
              title={APP_MESSAGES.RESPONSE_DETAIL}
              onClose={handleCloseDetail}
              closeLabel={APP_MESSAGES.CLOSE_DIALOG}
            />
          </div>
          {loadingDetail && <ResponseDetailLoading />}

          {detailError && (
            <div className="p-8 text-center space-y-3">
              <Alert>{detailError}</Alert>
              <Button
                variant="secondary"
                loading={loadingDetail}
                loadingLabel={APP_MESSAGES.RETRYING}
                onClick={() => void handleOpenDetail(selectedSubmissionId)}
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          )}

          {!loadingDetail && !detailError && selectedDetail && (
            <div className="flex flex-col max-h-conflict-height">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-900 break-words">
                  {selectedDetail.definitionSnapshot.title}
                </h3>
                <p className="mt-1 text-caption text-gray-500">
                  {APP_MESSAGES.RESPONSE_SUBMITTED_SUMMARY(
                    formatShortDateTime(selectedDetail.submittedAt),
                    selectedDetail.versionNumber,
                  )}
                </p>
              </div>

              {/* Modal Body: Q&A Snapshot Breakdown */}
              <div className="px-6 py-2 overflow-y-auto min-h-0 flex-1 text-xs">
                {(() => {
                  const qMap = new Map(
                    selectedDetail.definitionSnapshot.questions.map((q) => [
                      q.id,
                      q,
                    ]),
                  );
                  return selectedDetail.definitionSnapshot.questions.map(
                    (question, idx) => (
                      <ResponseFieldRow
                        key={question.id}
                        question={question}
                        index={idx}
                        questionMap={qMap}
                        answers={selectedDetail.answerSnapshot}
                      />
                    ),
                  );
                })()}
                <details className="py-4 border-t border-gray-200 text-caption text-gray-500">
                  <summary
                    tabIndex={0}
                    className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    {APP_MESSAGES.RECORD_DETAILS}
                  </summary>
                  <dl className="mt-3 space-y-2">
                    <div>
                      <dt>{APP_MESSAGES.RESPONSE_SESSION_REFERENCE}</dt>
                      <dd className="font-mono break-all">
                        {selectedDetail.sessionReference}
                      </dd>
                    </div>
                    <div>
                      <dt>{APP_MESSAGES.RESPONSE_RECORD_ID}</dt>
                      <dd className="font-mono break-all">
                        {selectedDetail.id}
                      </dd>
                    </div>
                  </dl>
                </details>
              </div>

              {/* Modal Footer */}
              <DialogActions className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 items-center">
                <Button
                  variant="primary"
                  onClick={handleCloseDetail}
                  className="text-xs px-4 py-1.5 font-medium rounded-lg"
                >
                  Close
                </Button>
              </DialogActions>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

/**
 * Renders an individual question & answer pair with historical labels from the snapshot.
 */
function ResponseFieldRow({
  question,
  index,
  questionMap,
  answers,
}: {
  question: Question;
  index: number;
  questionMap: Map<string, Question>;
  answers: PatientAnswers;
}) {
  const answer = answers[question.id];

  // Evaluate conditional visibility in the context of submitted answers
  const wasVisible = evaluateQuestionVisibility(question, answers, questionMap);

  return (
    <div
      data-testid={`response-field-${question.id}`}
      className="py-4 border-b border-gray-100"
    >
      {/* Question Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-gray-900 leading-snug">
            {index + 1}. {question.label}
          </h4>
          {question.description && (
            <p className="text-caption text-gray-500 mt-0.5">
              {question.description}
            </p>
          )}
        </div>
      </div>

      {/* Answer Display */}
      <div className="mt-2 break-words">
        {!wasVisible ? (
          <p className="text-caption italic text-gray-400">
            {APP_MESSAGES.RESPONSE_NOT_SHOWN}
          </p>
        ) : answer === undefined || answer === null || answer === "" ? (
          <p className="text-caption italic text-gray-400">
            {APP_MESSAGES.RESPONSE_NO_ANSWER}
          </p>
        ) : (
          <AnswerValueRenderer question={question} answer={answer} />
        )}
      </div>
    </div>
  );
}

/**
 * Accurately formats and renders answer data by field type.
 */
function AnswerValueRenderer({
  question,
  answer,
}: {
  question: Question;
  answer: unknown;
}) {
  switch (question.type) {
    case "checkbox":
      return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          {answer === true && (
            <CheckIcon className="w-4 h-4 text-emerald-600" />
          )}
          <span>
            {answer === true
              ? APP_MESSAGES.RESPONSE_CHECKED
              : APP_MESSAGES.RESPONSE_UNCHECKED}
          </span>
        </div>
      );

    case "single_select": {
      const selectedOption = question.options.find((opt) => opt.id === answer);
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-semibold text-xs border border-blue-200">
            {selectedOption ? selectedOption.label : String(answer)}
          </span>
        </div>
      );
    }

    case "multi_select": {
      const selectedIds = Array.isArray(answer) ? answer : [answer];
      const selectedOptions = selectedIds.map((id) => {
        const match = question.options.find((opt) => opt.id === id);
        return match ? match.label : String(id);
      });

      return (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.length === 0 ? (
            <span className="text-caption italic text-gray-400">
              None selected
            </span>
          ) : (
            selectedOptions.map((optLabel, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-900 font-medium text-xs border border-indigo-200"
              >
                {optLabel}
              </span>
            ))
          )}
        </div>
      );
    }

    case "number":
      return (
        <span className="font-mono text-sm font-semibold text-gray-900">
          {String(answer)}
        </span>
      );

    case "short_text":
      return (
        <p className="text-xs font-medium text-gray-900 whitespace-pre-wrap">
          {String(answer)}
        </p>
      );

    case "long_text":
      return (
        <div className="text-xs text-gray-900 whitespace-pre-wrap">
          {String(answer)}
        </div>
      );

    default:
      return (
        <span className="font-mono text-caption text-gray-700">
          {JSON.stringify(answer)}
        </span>
      );
  }
}
