export type IResponseData<T> = {
  data: T
  message: string
  statusCode: number
}

export type IResponseDataWithPage<T> = Omit<IResponseData<T>, 'data'> & {
  data: {
    items: T[]
    total: number
  }
}
