import { baseApi } from "@/redux/api/baseApi";

const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => "/user/profile",
      providesTags: ["User"],
      transformResponse: (response: any) => response.data,
    }),

    getPublicProfile: builder.query({
      query: (userId: string) => `/user/public/${userId}`,
      providesTags: ["User"],
      transformResponse: (response: any) => response.data,
    }),

    getAllUsers: builder.query({
      query: (params) => ({
        url: "/user",
        method: "GET",
        params: params,
      }),
      providesTags: ["User"],
    }),

    updateProfile: builder.mutation({
      query: (data) => ({
        url: "/user/profile",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    getUserById: builder.query({
      query: (userId: string) => `/user/${userId}`,
      providesTags: ["User"],
      transformResponse: (response: any) => response.data,
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ userId, role, assignedMaps, assignedCountries }) => ({
        url: `/user/update-role/${userId}`,
        method: "PATCH",
        body: { role, assignedMaps, assignedCountries },
      }),
      invalidatesTags: ["User"],
    }),

    assignEditorAccess: builder.mutation({
      query: ({ userId, assignedMaps, assignedCountries }) => ({
        url: `/user/assign-editor-access/${userId}`,
        method: "PATCH",
        body: { assignedMaps, assignedCountries },
      }),
      invalidatesTags: ["User"],
    }),

    inviteUser: builder.mutation({
      query: (data) => ({
        url: "/user/invite",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    updateUserMapAccess: builder.mutation({
      query: ({ userId, mapId, action }) => ({
        url: `/user/map-access/${userId}`,
        method: "PATCH",
        body: { mapId, action },
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetPublicProfileQuery,
  useUpdateProfileMutation,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
  useInviteUserMutation,
  useAssignEditorAccessMutation,
  useUpdateUserMapAccessMutation,
} = userApi;


