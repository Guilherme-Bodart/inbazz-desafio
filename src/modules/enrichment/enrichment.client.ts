import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

type ExchangeRateResponse = {
  amount: number;
  base: string;
  date: string;
  rate: number;
};

@Injectable()
export class EnrichmentClient {
  private readonly baseUrl = 'https://api.frankfurter.dev/v2';

  constructor(private readonly httpService: HttpService) {}

  async fetchExchangeRate(baseCurrency: string, targetCurrency: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<ExchangeRateResponse>(
          `${this.baseUrl}/rate/${baseCurrency}/${targetCurrency}`,
        ),
      );

      if (!data.rate || data.rate <= 0) {
        throw new BadGatewayException('Exchange rate response is invalid.');
      }

      return {
        rate: data.rate,
        payload: data,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: unknown) {
    if (!(error instanceof AxiosError)) {
      return 'Exchange rate provider request failed.';
    }

    const axiosError: AxiosError<unknown> = error;
    const responseData = axiosError.response?.data;

    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;

      if (typeof message === 'string') {
        return message;
      }
    }

    return axiosError.message;
  }
}
