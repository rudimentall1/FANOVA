export const PROVENANCE_ABI = [
  "function computeStoryId(address creator, bytes32 creatorSalt) view returns (bytes32)",
  "function getStory(bytes32 storyId) view returns ((address creator,uint64 latestVersion,bytes32 creatorSalt,bool exists))",
  "function getStoryVersion(bytes32 storyId,uint64 sourceVersion) view returns ((bytes32 sourceHash,bytes32 permissionHash,uint64 permissionVersion,bool exists))",
  "function getContribution(bytes32 contributionId) view returns ((bytes32 storyId,bytes32 contributionHash,bytes32 permissionHash,address contributor,address reviewer,uint64 sourceVersion,uint64 permissionVersion,uint256 decidedAt,bool exists,bool decided,bool approved))",
  "function registerStoryVersion(bytes32 storyId, bytes32 creatorSalt, uint64 sourceVersion, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)",
  "function registerContribution(bytes32 contributionId, bytes32 storyId, uint64 sourceVersion, uint64 permissionVersion, bytes32 permissionHash, bytes32 contributionHash, bool permissionAcknowledged)",
  "function decideContribution(bytes32 contributionId, bool approved, bytes32 reasonCode)",
  "event StoryVersionRegistered(bytes32 indexed storyId, uint64 indexed sourceVersion, address indexed creator, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)",
  "event ContributionRegistered(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address contributor, bytes32 contributionHash, uint64 permissionVersion, bytes32 permissionHash, bool permissionAcknowledged)",
  "event ContributionDecided(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address reviewer, bool approved, bytes32 reasonCode, uint256 decidedAt)"
];
