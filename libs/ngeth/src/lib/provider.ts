import { Injectable } from '@angular/core';
import { BaseProvider } from '@ethersproject/providers';

@Injectable({ providedIn: 'root' })
export class Provider extends BaseProvider {}

