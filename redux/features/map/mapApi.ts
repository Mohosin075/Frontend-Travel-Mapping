import { baseApi } from "@/redux/api/baseApi";

type GetMapsArgs = {
  page?: number;
  limit?: number;
  searchTerm?: string;
};

const mapApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createMap: builder.mutation({
      query: (data) => ({
        url: "/map",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Map"],
    }),

    getManagedMaps: builder.query<any, GetMapsArgs>({
      query: (params = {}) => ({ url: '/map/manage', method: 'GET', params }),
      providesTags: ['Map'],
    }),

    getMaps: builder.query<any, GetMapsArgs>({
      query: ({ page = 1, limit = 10, searchTerm = "" } = {}) => ({
        url: `/map?page=${page}&limit=${limit}&searchTerm=${searchTerm}`,
        method: "GET",
      }),
      providesTags: ["Map"],
      keepUnusedDataFor: 300, // cache for 5 minutes
    }),

    getMapById: builder.query<any, string>({
      query: (id: string) => ({
        url: `/map/${id}`,
        method: "GET",
      }),
      providesTags: ["Map"],
    }),

    getPurchasedMaps: builder.query<any, void>({
      query: () => ({
        url: "/map/purchased/all",
        method: "GET",
      }),
      providesTags: ["Map"],
    }),

    updateMap: builder.mutation({
      query: ({ id, data }: { id: string; data: any }) => ({
        url: `/map/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Map"],
    }),

    updateMapStatus: builder.mutation({
      query: ({ id, data }: { id: string; data: any }) => ({
        url: `/map/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Map"],
    }),

    deleteMap: builder.mutation({
      query: (id: string) => ({
        url: `/map/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Map"],
    }),

    getAvailableCountries: builder.query<any, void>({
      query: () => ({
        url: "/map/available-countries",
        method: "GET",
      }),
      providesTags: ["Map"],
      keepUnusedDataFor: 600, // cache for 10 minutes
      transformResponse: (response: any) => response.data,
    }),
  }),
});

export const {
  useCreateMapMutation,
  useGetMapsQuery,
  useGetManagedMapsQuery,
  useGetMapByIdQuery,
  useGetPurchasedMapsQuery,
  useUpdateMapMutation,
  useUpdateMapStatusMutation,
  useDeleteMapMutation,
  useGetAvailableCountriesQuery,
} = mapApi;
