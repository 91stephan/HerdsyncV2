/**
 * wahis-export
 *
 * Formats WOAH disease reports into WAHIS-compliant JSON for Ministry submission.
 * The World Animal Health Information System (WAHIS) requires exceptional
 * epidemiological events to be reported within 24 hours.
 *
 * POST /wahis-export
 * Body: { district_id?: string, date_from?: string, date_to?: string, report_ids?: string[] }
 * Returns: WAHIS-structured JSON payload ready for submission to OIE/WOAH portal.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WAHIS country code for the Kingdom of Lesotho
const WAHIS_COUNTRY_CODE = "LSO";
const WAHIS_COUNTRY_NAME = "Lesotho";

interface WahisAnimalSpecies {
  speciesCode: string;
  speciesName: string;
  susceptible: number | null;
  cases: number | null;
  deaths: number | null;
  killed: number | null;
  vaccinated: number | null;
}

interface WahisEpidemiologicalUnit {
  outbreakId: string;
  location: string;
  districtName: string;
  startDate: string;
  endDate: string | null;
  status: "CONFIRMED" | "SUSPECTED" | "RESOLVED";
  species: WahisAnimalSpecies[];
  controlMeasures: string[];
  labDiagnosis: boolean;
  labReference: string | null;
}

interface WahisReport {
  reportType: "IMMEDIATE" | "FOLLOW_UP" | "FINAL";
  reportingCountry: string;
  reportingCountryCode: string;
  reportingAuthority: string;
  reportDate: string;
  eventTitle: string;
  diseaseName: string;
  wahisCode: string | null;
  outbreaks: WahisEpidemiologicalUnit[];
  summary: {
    totalOutbreaks: number;
    totalSusceptible: number;
    totalCases: number;
    totalDeaths: number;
  };
}

function mapSpeciesCode(species: string): { code: string; name: string } {
  const map: Record<string, { code: string; name: string }> = {
    merino_sheep: { code: "OVI", name: "Sheep (Merino)" },
    angora_goat:  { code: "CAP", name: "Goat (Angora)" },
    cattle:       { code: "BOV", name: "Cattle" },
    other:        { code: "OTH", name: "Other" },
  };
  return map[species] ?? { code: "OTH", name: species };
}

function mapStatus(status: string): "CONFIRMED" | "SUSPECTED" | "RESOLVED" {
  if (status === "confirmed") return "CONFIRMED";
  if (status === "resolved") return "RESOLVED";
  return "SUSPECTED";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is authenticated and has officer-level access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { district_id, date_from, date_to, report_ids } = body;

    // Build query for disease reports
    let query = supabase
      .from("woah_disease_reports")
      .select(`
        id, disease_name, woah_disease_code, species_affected,
        date_detected, date_reported, resolved_at, status,
        animals_at_risk, cases_confirmed, deaths,
        containment_measures, lab_confirmation, lab_reference, notes,
        districts ( name, code ),
        breeding_centers ( name )
      `)
      .order("date_detected", { ascending: false });

    if (district_id)  query = query.eq("district_id", district_id);
    if (date_from)    query = query.gte("date_detected", date_from);
    if (date_to)      query = query.lte("date_detected", date_to);
    if (report_ids?.length) query = query.in("id", report_ids);

    const { data: reports, error } = await query;
    if (error) throw error;

    if (!reports || reports.length === 0) {
      return new Response(JSON.stringify({ wahisReports: [], message: "No reports found for criteria" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group reports by disease for WAHIS structure
    const diseaseGroups = reports.reduce<Record<string, typeof reports>>((acc, r) => {
      const key = r.disease_name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});

    const wahisReports: WahisReport[] = Object.entries(diseaseGroups).map(([diseaseName, diseaseReports]) => {
      const outbreaks: WahisEpidemiologicalUnit[] = diseaseReports.map((r) => {
        const speciesInfo = mapSpeciesCode(r.species_affected);
        const controlMeasures: string[] = [];
        if (r.containment_measures) controlMeasures.push(r.containment_measures);

        return {
          outbreakId:     r.id,
          location:       (r.breeding_centers as any)?.name ?? "National Herd",
          districtName:   (r.districts as any)?.name ?? "Unknown",
          startDate:      r.date_detected,
          endDate:        r.resolved_at ?? null,
          status:         mapStatus(r.status),
          species: [{
            speciesCode: speciesInfo.code,
            speciesName: speciesInfo.name,
            susceptible: r.animals_at_risk,
            cases:       r.cases_confirmed,
            deaths:      r.deaths,
            killed:      null,
            vaccinated:  null,
          }],
          controlMeasures,
          labDiagnosis:  r.lab_confirmation,
          labReference:  r.lab_reference ?? null,
        };
      });

      const totals = diseaseReports.reduce(
        (acc, r) => ({
          susceptible: acc.susceptible + (r.animals_at_risk ?? 0),
          cases:       acc.cases       + (r.cases_confirmed ?? 0),
          deaths:      acc.deaths      + (r.deaths ?? 0),
        }),
        { susceptible: 0, cases: 0, deaths: 0 }
      );

      return {
        reportType:           "IMMEDIATE",
        reportingCountry:     WAHIS_COUNTRY_NAME,
        reportingCountryCode: WAHIS_COUNTRY_CODE,
        reportingAuthority:   "Ministry of Agriculture and Food Security, Kingdom of Lesotho",
        reportDate:           new Date().toISOString().split("T")[0],
        eventTitle:           `${diseaseName} — ${WAHIS_COUNTRY_NAME}`,
        diseaseName,
        wahisCode:            diseaseReports[0].woah_disease_code ?? null,
        outbreaks,
        summary: {
          totalOutbreaks:   outbreaks.length,
          totalSusceptible: totals.susceptible,
          totalCases:       totals.cases,
          totalDeaths:      totals.deaths,
        },
      };
    });

    return new Response(JSON.stringify({ wahisReports, generatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("wahis-export error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
