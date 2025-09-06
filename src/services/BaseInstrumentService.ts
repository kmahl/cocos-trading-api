/**
 * Base class for services that need instrument validation
 */

import { InstrumentService } from '../services/InstrumentService';
import { ValidationError } from '../middlewares/errorHandler';

export abstract class BaseInstrumentService {
  protected instrumentService: InstrumentService;

  constructor(instrumentService?: InstrumentService) {
    this.instrumentService = instrumentService || new InstrumentService();
  }

  protected async validateInstrumentExists(
    instrumentId: number
  ): Promise<void> {
    const instrument =
      await this.instrumentService.getInstrumentById(instrumentId);
    if (!instrument) {
      throw new ValidationError(`Instrument with ID ${instrumentId} not found`);
    }
  }

  protected async validateInstrumentHasPrice(
    instrumentId: number
  ): Promise<number> {
    const price = await this.instrumentService.getCurrentPrice(instrumentId);
    if (!price || price <= 0) {
      throw new ValidationError(
        `No valid price available for instrument ${instrumentId}`
      );
    }
    return price;
  }
}
