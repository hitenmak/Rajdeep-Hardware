type SuccessResult = {
  result: any;
}

type ErrorResult = {
  error: string;
}

export type TDaoResult = SuccessResult | ErrorResult;
