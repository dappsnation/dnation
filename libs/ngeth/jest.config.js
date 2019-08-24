module.exports = {
  name: 'ngeth',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/libs/ngeth',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
