"use client";

import { Text } from "@/components/ui/text";
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
            <Text
              as="h1"
              variant="body"
              tone="primary"
              truncate
              weight="semibold"
            >
              {formName}
            </Text>
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
            <Text variant="inherit">Editor</Text>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Banner / Stat summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text as="h2" variant="heading" tone="primary" weight="semibold">
              Clinical Intake Submissions
            </Text>
            <div className="mt-0.5">
              <Text as="p" variant="small" tone="muted">
                Authoritative, immutable patient intake records submitted
                against published form versions.
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Badge tone="success" className="py-1 text-xs font-medium">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              {totalCount} Completed{" "}
              {totalCount === 1 ? "Response" : "Responses"}
            </Badge>
          </div>
          <Button
            loading={loadingList}
            loadingLabel={APP_MESSAGES.LOADING_RESPONSES}
            onClick={() => void handleRefresh()}
            variant="secondary"
            size="sm"
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
              <Text as="h3" variant="body" tone="primary" weight="semibold">
                No Responses Yet
              </Text>
              <div className="max-w-md mx-auto">
                <Text as="p" variant="small" tone="muted">
                  Patient submissions will appear here automatically once
                  clinical intake forms are completed.
                </Text>
              </div>
              <div className="pt-2">
                <Link
                  href={ROUTES.editForm(formId)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  <Text variant="inherit">Open Editor</Text>
                </Link>
              </div>
            </div>
          )
        ) : (
          /* Table of Responses */
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table aria-label="Clinical Form Responses">
                <Thead>
                  <Tr variant="header">
                    <Th scope="col" padding="roomy">
                      Submission Date
                    </Th>
                    <Th scope="col" padding="roomy">
                      Form Name
                    </Th>
                    <Th scope="col" padding="roomy">
                      Version
                    </Th>
                    <Th scope="col" padding="roomy">
                      Status
                    </Th>
                    <Th scope="col" padding="roomy">
                      Session Ref
                    </Th>
                    <Th scope="col" padding="roomy" align="right">
                      Actions
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {submissions.map((sub) => (
                    <Tr
                      key={sub.id}
                      onClick={(event) => {
                        detailTrigger.current =
                          event.currentTarget.querySelector("button");
                        void handleOpenDetail(sub.id);
                      }}
                      interactive
                      selected={selectedSubmissionId === sub.id}
                    >
                      <Td padding="roomy">
                        <Text variant="small" weight="medium">
                          {formatDetailedDateTime(sub.submittedAt)}
                        </Text>
                      </Td>
                      <Td padding="roomy" truncate>
                        <Text variant="small" weight="medium">
                          {sub.formName || formName}
                        </Text>
                      </Td>
                      <Td padding="roomy">
                        <Badge tone="neutral" className="px-2">
                          v{sub.versionNumber}
                        </Badge>
                      </Td>
                      <Td padding="roomy">
                        <Badge tone="success" className="px-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Completed
                        </Badge>
                      </Td>
                      <Td padding="roomy">
                        <Text variant="small" tone="muted" mono>
                          {sub.sessionReference}
                        </Text>
                      </Td>
                      <Td padding="roomy" align="right">
                        <Button
                          loading={
                            loadingDetail && selectedSubmissionId === sub.id
                          }
                          loadingLabel={APP_MESSAGES.LOADING}
                          onClick={(e) => {
                            e.stopPropagation();
                            detailTrigger.current = e.currentTarget;
                            void handleOpenDetail(sub.id);
                          }}
                          variant="link"
                          tone="primary"
                          size="xs"
                        >
                          <Text variant="inherit">View Detail</Text>
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
                <Text variant="inherit">
                  Showing {currentPage * PAGE_SIZE + 1}–
                  {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount} responses
                </Text>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={currentPage === 0 || loadingList}
                    onClick={() => void loadPage(currentPage - 1)}
                    variant="secondary"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    <Text variant="inherit" weight="medium">
                      Page {currentPage + 1} of{" "}
                      {Math.ceil(totalCount / PAGE_SIZE)}
                    </Text>
                  </span>
                  <Button
                    disabled={
                      (currentPage + 1) * PAGE_SIZE >= totalCount || loadingList
                    }
                    onClick={() => void loadPage(currentPage + 1)}
                    variant="secondary"
                    size="sm"
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
                loading={loadingDetail}
                loadingLabel={APP_MESSAGES.RETRYING}
                onClick={() => void handleOpenDetail(selectedSubmissionId)}
                variant="secondary"
                size="sm"
              >
                Retry
              </Button>
            </div>
          )}

          {!loadingDetail && !detailError && selectedDetail && (
            <div className="flex flex-col max-h-conflict-height">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80">
                <div className="break-words">
                  <Text as="h3" variant="body" tone="primary" weight="semibold">
                    {selectedDetail.definitionSnapshot.title}
                  </Text>
                </div>
                <div className="mt-1">
                  <Text as="p" variant="caption" tone="muted">
                    {APP_MESSAGES.RESPONSE_SUBMITTED_SUMMARY(
                      formatShortDateTime(selectedDetail.submittedAt),
                      selectedDetail.versionNumber,
                    )}
                  </Text>
                </div>
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
                <Button onClick={handleCloseDetail} variant="primary" size="sm">
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
          <Text as="h4" variant="small" tone="primary" weight="semibold">
            {index + 1}. {question.label}
          </Text>
          {question.description && (
            <div className="mt-0.5">
              <Text as="p" variant="caption" tone="muted">
                {question.description}
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Answer Display */}
      <div className="mt-2 break-words">
        {!wasVisible ? (
          <Text as="p" variant="caption" tone="subtle" italic>
            {APP_MESSAGES.RESPONSE_NOT_SHOWN}
          </Text>
        ) : answer === undefined || answer === null || answer === "" ? (
          <Text as="p" variant="caption" tone="subtle" italic>
            {APP_MESSAGES.RESPONSE_NO_ANSWER}
          </Text>
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
          <Text variant="inherit">
            {answer === true
              ? APP_MESSAGES.RESPONSE_CHECKED
              : APP_MESSAGES.RESPONSE_UNCHECKED}
          </Text>
        </div>
      );

    case "single_select": {
      const selectedOption = question.options.find((opt) => opt.id === answer);
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200">
            <Text variant="small" tone="info" weight="semibold">
              {selectedOption ? selectedOption.label : String(answer)}
            </Text>
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
            <Text variant="caption" tone="subtle" italic>
              None selected
            </Text>
          ) : (
            selectedOptions.map((optLabel, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200"
              >
                <Text variant="small" tone="info" weight="medium">
                  {optLabel}
                </Text>
              </span>
            ))
          )}
        </div>
      );
    }

    case "number":
      return (
        <Text variant="body" tone="primary" mono weight="semibold">
          {String(answer)}
        </Text>
      );

    case "short_text":
      return (
        <Text
          as="p"
          variant="small"
          tone="primary"
          wrap="preserve"
          weight="medium"
        >
          {String(answer)}
        </Text>
      );

    case "long_text":
      return (
        <div className="text-xs text-gray-900 whitespace-pre-wrap">
          {String(answer)}
        </div>
      );

    default:
      return (
        <Text variant="caption" tone="secondary" mono>
          {JSON.stringify(answer)}
        </Text>
      );
  }
}
