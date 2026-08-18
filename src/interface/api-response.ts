export type IResponseData<T> = {
  data: T
  message: string
  statusCode: number
}

export type IResponseDataWithPage<T> = Omit<IResponseData<T>, 'data'> & {
  items: T[]
  page: number
  page_size: number
  total: number
}
