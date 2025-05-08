import { api } from "./api"

export const uploadService =
{
    uploadImage: async (file) =>
    {
        try
        {
            const formData = new FormData()
            formData.append("file", file) 
            const response = await api.post("/api/upload", formData,
                {
                    headers:
                    {
                        "Content-Type": "multipart/form-data",
                    }
                }
            )
            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }
}
