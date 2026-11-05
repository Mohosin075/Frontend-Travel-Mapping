import { baseApi } from "@/redux/api/baseApi";

export const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    recordActivity: builder.mutation<any, void>({
      query: () => ({ url: '/stats/activity', method: 'POST' }),
    }),
    recordUsage: builder.mutation<any, { type: string; id: string; visitorId: string }>({
      query: (body) => ({ url: '/stats/usage', method: 'POST', body }),
    }),
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
  useRecordActivityMutation,
  useGetDashboardStatsQuery,
  useGetReportsQuery,
  useSearchReportEntitiesQuery,
  useGetEntityUsersQuery,
} = statsApi;
