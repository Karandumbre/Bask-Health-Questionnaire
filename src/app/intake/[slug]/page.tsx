import type { Metadata } from "next";
import { PatientIntakeView } from "@/features/patients/components/PatientIntakeView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Patient Intake | Bask Health`,
    description: `Complete your secure patient intake form for ${slug}.`,
  };
}

export default async function PatientIntakePage({ params }: PageProps) {
  const { slug } = await params;

  return <PatientIntakeView slug={slug} />;
}

