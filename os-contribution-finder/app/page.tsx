import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";
import { IssueGridSkeleton } from "@/components/Skeletons";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <IssueGridSkeleton count={6} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
