import { Share } from 'react-native';

import { exportApi } from '@/lib/api/endpoints';

import { exportSetsCsv } from './export-csv';

const files: { name: string; content?: string; created?: unknown }[] = [];

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;
    entry: (typeof files)[number];
    constructor(_dir: string, name: string) {
      this.uri = `file:///cache/${name}`;
      this.entry = { name };
      files.push(this.entry);
    }
    create(options: unknown) {
      this.entry.created = options;
    }
    async write(content: string) {
      this.entry.content = content;
    }
  },
}));
jest.mock('@/lib/api/endpoints', () => ({ exportApi: { setsCsv: jest.fn() } }));

it('saves the CSV with a BOM and opens the share sheet', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  jest.mocked(exportApi.setsCsv).mockResolvedValue('a,b\r\n1,2\r\n');

  await exportSetsCsv('2026-10-19');

  expect(files).toEqual([
    {
      name: 'gsc-tracker-sets-2026-10-19.csv',
      created: { overwrite: true },
      content: '\uFEFFa,b\r\n1,2\r\n',
    },
  ]);
  expect(share).toHaveBeenCalledWith({ url: 'file:///cache/gsc-tracker-sets-2026-10-19.csv' });
});
