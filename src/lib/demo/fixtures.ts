import type { SkillsByCodeRes, SearchOccupationRes } from "../../types/api";
import type { RankByCodesReq, RankByCodesRes } from "../../types/rank";
import type { TrainingAdviceRes } from "../../types/training";
import type { CareerGrowthResponse } from "../../types/careerGrowth";
import type { DemandRes } from "../../types/demand";
import type { ShortageRes } from "../../types/shortage";
import type { Query } from "../api/apiClient";
import { INDUSTRIES } from "../../data/industries";

// Illustrative fixtures only: these are not live market statistics or recommendations.
export const demoOccupations = [
  { code: "261111", title: "ICT Business Analyst", industries: ["J", "M"] },
  { code: "261312", title: "Developer Programmer", industries: ["J", "M"] },
  { code: "262113", title: "Systems Administrator", industries: ["J", "M"] },
  { code: "411711", title: "Community Worker", industries: ["Q"] },
  { code: "411712", title: "Disabilities Services Officer", industries: ["Q"] },
  { code: "423111", title: "Aged or Disabled Carer", industries: ["Q"] },
  { code: "331212", title: "Carpenter", industries: ["E"] },
  { code: "334111", title: "Plumber (General)", industries: ["E"] },
  { code: "341111", title: "Electrician (General)", industries: ["E"] },
  {
    code: "621111",
    title: "Sales Assistant (General)",
    industries: ["G", "F"],
  },
  { code: "142111", title: "Retail Manager (General)", industries: ["G", "F"] },
  { code: "621511", title: "Retail Supervisor", industries: ["G", "F"] },
  { code: "351311", title: "Chef", industries: ["H"] },
  { code: "351411", title: "Cook", industries: ["H"] },
  { code: "431511", title: "Waiter", industries: ["H"] },
  { code: "421111", title: "Child Care Worker", industries: ["P"] },
  { code: "422116", title: "Teachers Aide", industries: ["P"] },
  { code: "134111", title: "Child Care Centre Manager", industries: ["P"] },
  { code: "511112", title: "Program or Project Administrator", industries: [] },
  { code: "531111", title: "General Clerk", industries: [] },
  { code: "512111", title: "Office Manager", industries: [] },
];
const abilities = {
  knowledge_titles: [
    { code: "2.C.1.a", title: "Administration and Management" },
    { code: "2.C.1.e", title: "Customer and Personal Service" },
  ],
  skill_titles: [
    { code: "2.A.1.b", title: "Active Listening" },
    { code: "2.A.2.a", title: "Critical Thinking" },
  ],
  tech_titles: [{ code: "43231507", title: "Project management software" }],
};
const courses = [
  {
    vet_course_code: "BSB40920",
    course_name: "Certificate IV in Project Management Practice",
  },
  { vet_course_code: "BSB30120", course_name: "Certificate III in Business" },
];
export const demoGlossary = [
  {
    term: "Vocational education and training",
    acronym: "VET",
    description: "Education and training focused on practical skills for work.",
  },
  {
    term: "Certificate",
    description:
      "A qualification recognising completion of a defined program of study.",
  },
  {
    term: "Recognition of prior learning",
    acronym: "RPL",
    description:
      "Assessment of skills gained through previous study, work or experience.",
  },
];
function occupation(code: string) {
  const found = demoOccupations.find((item) => item.code === code);
  if (!found)
    throw new Error("Occupation is not available in the demo fixtures.");
  return found;
}
function industryRoles(industry: string) {
  // The canonical label is resolved by the caller below.
  const code = INDUSTRIES.find((item) => item.labelEn === industry)?.code;
  return demoOccupations.filter(
    (item) =>
      item.industries.length === 0 || item.industries.includes(code ?? ""),
  );
}

export function demoResponse(
  method: "GET" | "POST",
  path: string,
  query?: Query,
  body?: unknown,
): unknown {
  if (method === "GET" && path === "/anzsco/search") {
    const industry = String(query?.industry ?? "");
    const keyword = String(query?.s ?? "")
      .toLowerCase()
      .trim();
    return {
      industry,
      items: industryRoles(industry)
        .filter(
          (item) =>
            item.title.toLowerCase().includes(keyword) ||
            item.code.includes(keyword),
        )
        .slice(0, Number(query?.limit ?? 10))
        .map((item) => ({ anzsco_code: item.code, anzsco_title: item.title })),
    } satisfies SearchOccupationRes;
  }
  const skills = path.match(/^\/anzsco\/(\d{6})\/skills$/);
  if (method === "GET" && skills) {
    const item = occupation(skills[1]);
    return {
      anzsco: { code: item.code },
      ...abilities,
    } satisfies SkillsByCodeRes;
  }
  if (method === "POST" && path === "/occupations/rank-by-codes") {
    const request = body as RankByCodesReq;
    const selected = new Set(
      request.selections.map((item) => item.type + "|" + item.code),
    );
    const buckets = {
      knowledge: abilities.knowledge_titles,
      skill: abilities.skill_titles,
      tech: abilities.tech_titles,
    };
    const unmatched = {
      knowledge: [] as string[],
      skill: [] as string[],
      tech: [] as string[],
    };
    let count = 0;
    for (const type of ["knowledge", "skill", "tech"] as const) {
      for (const ability of buckets[type]) {
        if (selected.has(type + "|" + ability.code)) count++;
        else unmatched[type].push(ability.title);
      }
    }
    // Target roles additionally require Writing, creating a useful training gap.
    if (!selected.has("skill|2.A.1.c")) unmatched.skill.push("Writing");
    const items = industryRoles(request.industry)
      .slice(0, Number(query?.limit ?? 10))
      .map((item) => ({
        occupation_code: item.code,
        occupation_title: item.title,
        score: count / 6,
        count,
        unmatched,
        anzsco: [
          {
            code: item.code,
            title: item.title,
            description:
              "Illustrative career option from the local demo catalog.",
          },
        ],
      }));
    return {
      cached: false,
      total_selected: request.selections.length,
      industry: request.industry,
      limit: Number(query?.limit ?? 10),
      items,
    } satisfies RankByCodesRes;
  }
  const training = path.match(/^\/api\/anzsco\/(\d{6})\/training-advice$/);
  if (method === "GET" && training) {
    const item = occupation(training[1]);
    return {
      anzsco: { code: item.code, title: item.title },
      total: courses.length,
      vet_courses: courses,
    } satisfies TrainingAdviceRes;
  }
  const demand = path.match(/^\/api\/anzsco\/(\d{6})\/demand$/);
  if (method === "GET" && demand) {
    const item = occupation(demand[1]);
    const state = String(query?.state ?? "VIC");
    return {
      anzsco: { anzsco_code: item.code, anzsco_title: item.title },
      skill_level: "2",
      national_rating: "S",
      state,
      state_code: state,
      state_rating: "S",
    } satisfies DemandRes;
  }
  const growth = path.match(/^\/api\/career-growth\/(\d{4})$/);
  if (method === "GET" && growth) {
    return {
      anzscoCode: growth[1],
      majorGroupTitle: "Demo occupation group",
      fiveYearGrowthRate: 12,
      tenYearGrowthRate: 24,
      growthRanking: "3rd out of 43",
      currentEmployment: 42000,
      projectedNewJobs: 5040,
      nationalAverageRate: 7,
      relatedOccupationsRate: 9,
      selectedOccupationRate: 12,
    } satisfies CareerGrowthResponse;
  }
  if (method === "POST" && path === "/api/shortage/by-anzsco") {
    const code = (body as { anzsco_code: string }).anzsco_code;
    occupation(code);
    return {
      query: { input_code: code, match_prefix4: code.slice(0, 4) },
      latest_by_state: [
        "NSW",
        "VIC",
        "QLD",
        "SA",
        "WA",
        "TAS",
        "NT",
        "ACT",
      ].map((state, index) => ({
        state,
        date: "2025-01-01T00:00:00.000Z",
        nsc_emp: 12000 - index * 1400,
      })),
    } satisfies ShortageRes;
  }
  if (method === "GET" && path === "/api/glossary/detail") {
    const keyword = String(query?.q ?? "").toLowerCase();
    return demoGlossary.filter(
      (item) =>
        item.term.toLowerCase().includes(keyword) ||
        item.acronym?.toLowerCase().includes(keyword),
    );
  }
  if (path === "/api/contact")
    return {
      status: "error",
      message:
        "Feedback is unavailable in Demo Mode. Exit Demo Mode to send feedback.",
    };
  throw new Error("No local demo fixture for " + method + " " + path);
}
