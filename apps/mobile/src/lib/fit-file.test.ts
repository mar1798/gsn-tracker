import { fileFromUrl, isFitFileName } from './fit-file';

describe('isFitFileName', () => {
  it.each([
    ['2026-10-17_strength.fit', true],
    ['ACTIVITY.FIT', true],
    ['activity.fit ', true],
    ['activity.zip', false],
    ['fit', false],
  ])('%p → %p', (name, expected) => {
    expect(isFitFileName(name)).toBe(expected);
  });
});

describe('fileFromUrl', () => {
  it('extracts the decoded file name from a file URL', () => {
    const url =
      'file:///private/var/mobile/Containers/Data/Application/X/Documents/Inbox/My%20Workout.fit';
    expect(fileFromUrl(url)).toEqual({ uri: url, name: 'My Workout.fit' });
  });

  it('ignores non-file URLs', () => {
    expect(fileFromUrl('gsctracker://workouts/1')).toBeNull();
    expect(fileFromUrl('/workouts/1')).toBeNull();
    expect(fileFromUrl('file:///')).toBeNull();
  });

  it('keeps a malformed escape as is', () => {
    expect(fileFromUrl('file:///tmp/100%.fit')?.name).toBe('100%.fit');
  });
});
