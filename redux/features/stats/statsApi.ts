import { baseApi } from "@/redux/api/baseApi";

const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<any, void>({
      query: () => ({
        url: "/stats/dashboard",
        method: "GET",
      }),
      providesTags: ["Stats"],
    }),
    getReports: builder.query<any, any>({
      query: (params) => ({
        url: "/stats/reports",
        method: "GET",
        params,
      }),
      providesTags: ["Stats"],
    }),
    searchReportEntities: builder.query<any, { searchTerm: string }>({
      query: ({ searchTerm }) => ({
        url: "/stats/reports/search",
        method: "GET",
        params: { searchTerm },
      }),
    }),
    getEntityUsers: builder.query<any, { type: string; id: string; timeFilter?: string }>({
      query: ({ type, id, timeFilter }) => ({
        url: "/stats/entity-users",
        params: { type, id, timeFilter },
        method: "GET",
      }),
      providesTags: ["Stats"],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetReportsQuery,
  useSearchReportEntitiesQuery,
  useGetEntityUsersQuery,
} = statsApi;
