/* eslint-disable new-cap */

import { getPools, getSmartRoute } from "@flowx-pkg/ts-sdk";
import { BigNumber as BNumber } from "bignumber.js";

import {
  CoinNode,
  ExtractedAmountType,
  ExtractedIPoolsInfoType,
  ExtractedPairSettingsType,
  ExtractedSmartRouteType,
  ExtractedSwapCalculatedOutputDataType,
  ShortCoinMetadata,
} from "./types";

export const getReserveByCoinType = (coinX: string, pairSetting: ExtractedIPoolsInfoType) => {
  if (coinX === pairSetting.coinX) {
    return {
      reserveX: pairSetting.reserveX?.fields?.balance || "0",
      reserveY: pairSetting.reserveY?.fields?.balance || "0",
    };
  }

  return {
    reserveX: pairSetting.reserveY?.fields?.balance || "0",
    reserveY: pairSetting.reserveX?.fields?.balance || "0",
  };
};

export const getAmountOut = (amountIn: string | number, reserveIn: string, reserveOut: string, fee: number): string => {
  const amountWithFee = BigNumberInstance(amountIn).multipliedBy(1 - fee);
  const numerator = amountWithFee.multipliedBy(reserveOut);
  const denominator = amountWithFee.plus(reserveIn);

  return numerator.dividedBy(denominator).toFixed(0);
};

const _getAmountOut = (
  pair: ExtractedPairSettingsType,
  _amountIn: string | number,
  coinIn: string,
  poolInfos: ExtractedIPoolsInfoType[],
) => {
  const poolDetail = poolInfos.find((item) => item.objectId === pair.lpObjectId);

  if (poolDetail === undefined) {
    throw new Error("Empty pool detail");
  }

  if (poolDetail.feeRate === undefined) {
    throw new Error("Empty feeRate");
  }

  const reserve = getReserveByCoinType(coinIn, poolDetail);
  return getAmountOut(_amountIn, reserve.reserveX, reserve.reserveY, poolDetail.feeRate);
};
export const calculateAmountOutFromPath = (
  amount: string | number,
  coinInType: string,
  tradAbles: ExtractedPairSettingsType[],
  poolInfos: ExtractedIPoolsInfoType[],
): ExtractedSmartRouteType => {
  const smartRoute: ExtractedSmartRouteType = {};
  smartRoute.amountIn = amount;
  smartRoute.routes = [];
  let amountOut = amount;
  let lpOutType = coinInType;

  for (let i = 0; i < tradAbles?.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route: any = {};
    route.coinTypeIn = lpOutType;
    route.amountIn = amountOut;

    amountOut = _getAmountOut(tradAbles[i], amountOut, lpOutType, poolInfos);
    lpOutType = tradAbles[i].coinYType == lpOutType ? tradAbles[i].coinXType : tradAbles[i].coinYType;

    route.coinTypeOut = lpOutType;
    route.amountOut = amountOut;
    route.pair = tradAbles[i];

    smartRoute.routes.push(route);
  }

  smartRoute.amountOut = amountOut;
  return smartRoute;
};

export const LP_DECIMAL = 9;

BNumber.config({
  DECIMAL_PLACES: 1000,
  EXPONENTIAL_AT: [-1000, 1000],
  ROUNDING_MODE: 3,
});
export const BigNumber = BNumber;
export const BigNumberInstance = (value: string | number): BNumber => new BigNumber(value);
export const BIG_ZERO = BigNumberInstance(0);
export const BIG_ONE = BigNumberInstance(1);
export const BIG_NINE = BigNumberInstance(9);
export const BIG_TEN = BigNumberInstance(10);

export const getBalanceAmount = (amount: string | number, decimals = LP_DECIMAL) => {
  return BigNumberInstance(amount).div(BIG_TEN.pow(decimals));
};

export const getDecimalAmount = (amount: string | number, decimals = LP_DECIMAL) => {
  return BigNumberInstance(amount).times(BIG_TEN.pow(decimals)).toFixed();
};

export const calculateAmountOutInternal = async (
  value: string | number,
  coinIn: CoinNode,
  coinOut: CoinNode,
  coins: ShortCoinMetadata[],
): Promise<ExtractedSwapCalculatedOutputDataType> => {
  const { poolInfos } = await getPools();
  const decimalInAmount = BigNumberInstance(getDecimalAmount(value, coinIn.decimals)).toFixed(0);
  const amountInFormat = getBalanceAmount(
    decimalInAmount,
    coins.find((coin) => coin.coinType === coinIn.type)?.decimals,
  ).toFixed();

  const amountInNewState: ExtractedAmountType = {
    decimalAmount: decimalInAmount,
    amount: amountInFormat,
  };

  const trades = await getSmartRoute(decimalInAmount, coinIn.type, coinOut.type, true);

  const smartRoute = calculateAmountOutFromPath(decimalInAmount, coinIn.type, trades, poolInfos);
  const decimalOutAmount = smartRoute.amountOut;

  if (decimalOutAmount === undefined) {
    throw new Error("Decimal amount out is undefined");
  }

  const amountOutFormat = getBalanceAmount(
    decimalOutAmount,
    coins.find((coin) => coin.coinType === coinOut.type)?.decimals,
  ).toFixed();

  const amountOutNewState: ExtractedAmountType = {
    decimalAmount: decimalOutAmount,
    amount: amountOutFormat,
  };
  return {
    amountIn: amountInNewState,
    amountOut: amountOutNewState,
    trades,
    smartRoute,
  };
};
