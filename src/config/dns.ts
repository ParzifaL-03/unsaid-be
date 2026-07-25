import * as dns from 'node:dns';
import { Logger } from '@nestjs/common';

const logger = new Logger('DnsConfig');

export function configureDnsServers(servers?: string[]) {
  if (!servers?.length) {
    return;
  }

  dns.setServers(servers);
  logger.log(`Using custom DNS servers: ${servers.join(', ')}`);
}
