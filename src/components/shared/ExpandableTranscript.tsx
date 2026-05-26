"use client";

import { useId, useState } from "react";

type ExpandableTranscriptProps = {
  transcript: string;
  previewCharacterLimit?: number;
  collapsedHeightClassName?: string;
  className?: string;
};

export function ExpandableTranscript({
  transcript,
  previewCharacterLimit = 420,
  collapsedHeightClassName = "max-h-28",
  className = "",
}: ExpandableTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const transcriptId = useId();
  const cleanedTranscript = transcript.trim();
  const canExpand = cleanedTranscript.length > previewCharacterLimit;

  if (!cleanedTranscript) {
    return null;
  }

  return (
    <div className={className}>
      <p
        id={transcriptId}
        className={`mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-vocali-teal-deep ${
          canExpand && !isExpanded
            ? `${collapsedHeightClassName} overflow-hidden`
            : ""
        }`}
      >
        {cleanedTranscript}
      </p>
      {canExpand ? (
        <button
          type="button"
          aria-controls={transcriptId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-2 min-h-10 rounded-full px-1 text-sm font-black text-vocali-teal transition hover:text-vocali-teal-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vocali-teal"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
