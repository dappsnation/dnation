module.exports = {
  name: 'entity-form',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/libs/entity-form',
  snapshotSerializers: [
    'jest-preset-angular/AngularSnapshotSerializer.js',
    'jest-preset-angular/HTMLCommentSerializer.js'
  ]
};
