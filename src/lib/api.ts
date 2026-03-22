import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:8080/api",
})

export const searchDocuments = async (query: string) => {
  const params: any = {}

  if (query) params.query = query

  const response = await API.get("/search", { params })
  return response.data
}
