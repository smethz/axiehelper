import axios, { AxiosError } from "axios"

export function isAPIError(payload: any): payload is AxiosError<any, any> {
	return axios.isAxiosError(payload)
}
