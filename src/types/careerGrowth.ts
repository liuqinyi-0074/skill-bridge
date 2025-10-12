
/**
 * Request parameters for career growth data
 */
export interface CareerGrowthRequest {
  /** 4-digit ANZSCO code */
  code: string;
}

/**
 * Complete response data for career growth statistics
 */
export interface CareerGrowthResponse {
  /** Queried ANZSCO code */
  anzscoCode: string;
  /** Major group title (e.g., "ICT Professionals") */
  majorGroupTitle: string;
  
  /** 5-year growth rate (%) */
  fiveYearGrowthRate: number;
  /** 10-year growth rate (%) */
  tenYearGrowthRate: number;
  /** Growth ranking (e.g., "3rd out of 43") */
  growthRanking: string;
  
  /** Current employment count */
  currentEmployment: number;
  /** Projected new jobs to be created */
  projectedNewJobs: number;
  
  /** National average growth rate (%) */
  nationalAverageRate: number;
  /** Average growth rate of related occupations (%) */
  relatedOccupationsRate: number;
  /** Growth rate of the selected occupation (%) */
  selectedOccupationRate: number;
  
  /** Employment data for related industries */
  relatedIndustryEmployment: IndustryEmployment[];
  /** Employment data for selected industries */
  selectedIndustryEmployment: IndustryEmployment[];
}

/**
 * Industry employment data structure
 */
export interface IndustryEmployment {
  /** Industry name */
  industryName: string;
  /** Employment count in this industry */
  employment: number;
  /** Percentage of total employment */
  percentage: number;
}





