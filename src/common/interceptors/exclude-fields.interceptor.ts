import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeFieldsInterceptor implements NestInterceptor {
  private readonly fields: string[];

  constructor(fields: string[]) {
    this.fields = fields;
  }
  // Campos a excluir
  //   private fields: string[] = [
  //     'status',
  //     'esto claramente no es un campo, pero igual funciona, porque en caso de no existir se ignora',
  //   ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.processData(data)));
  }

  // Se comprueba si data es un array o un objeto
  private processData(data: any) {
    if (Array.isArray(data)) {
      // Si es un array, aplica la función excludeFields a cada elemento
      return data.map((item) => this.excludeFields(item));
    }
    // Si no es un array, aplica la función directamente
    return this.excludeFields(data);
  }

  // Se excluyen los campos definidos en el array 'fields'
  private excludeFields(item: any) {
    if (item && typeof item === 'object') {
      // Desestructura el objeto y elimina los campos especificados en 'fields'
      const result = { ...item };
      this.fields.forEach((field) => {
        delete result[field];
      });
      return result;
    }
    return item;
  }
}
