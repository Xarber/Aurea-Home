// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {localWallpaperPhotos,localWallpaperVideo,photoIndex} from '../../src/model/photo-wallpapers.ts';

test('rotation advances by interval and wraps without timers while offline',()=>{
  assert.equal(photoIndex(3,5,0),0);
  assert.equal(photoIndex(3,5,299999),0);
  assert.equal(photoIndex(3,5,300000),1);
  assert.equal(photoIndex(3,5,900000),0);
  assert.equal(photoIndex(0,5,300000),-1);
  assert.equal(photoIndex(3,-1,300000),1);
});

test('private photo list rejects traversal, network URLs and other profiles',()=>{
  const own='file:///data/user/0/it.xarber.aurea/no_backup/wallpaper-photos/home/af1aa111-aa11-aa11-1aaa-aaaaaaaaaaaa.jpg';
  assert.deepEqual(localWallpaperPhotos([own,own,own.replace('home/','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/'),
    own.replace('file:///','https://'),own.replace('/no_backup','/../no_backup')],'home'),[own]);
});

test('wallpaper video only accepts the profile-owned private clip',()=>{
  const own='file:///data/user/0/it.xarber.aurea/no_backup/wallpaper-videos/home/clip.mp4?revision=234';
  assert.equal(localWallpaperVideo(own,'home'),own);
  assert.equal(localWallpaperVideo(own,'other'),undefined);
  assert.equal(localWallpaperVideo(own.replace('clip.mp4','other.mp4'),'home'),undefined);
  assert.equal(localWallpaperVideo(own.replace('file:///','https://'),'home'),undefined);
});
