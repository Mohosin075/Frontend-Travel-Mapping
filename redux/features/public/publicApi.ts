import { baseApi } from "@/redux/api/baseApi";

export const publicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublicPlacesBusiness: builder.query({
      query: ({
        page = 1,
        limit = 10,
        searchTerm = "",
        status = "",
        map = "",
        sort = "",
        country = "",
      }) => ({
        url: "/map/discovery",
        params: { page, limit, searchTerm, status, map, sort, country },
        method: "GET",
      }),
      providesTags: ["Place"],
      keepUnusedDataFor: 300,
      transformResponse: (response: any) => response.data,
    }),
    submitContactForm: builder.mutation({
      query: (data) => ({
        url: "/contact",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useGetPublicPlacesBusinessQuery,
  useSubmitContactFormMutation,
} = publicApi;
