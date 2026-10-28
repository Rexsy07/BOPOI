import { test, expect } from 'bun:test';

interface SimulationEdge {
  follower: string;
  following: string;
}

test('Verify triadic network expansion tracking closures', () => {
  const edgeMatrix: SimulationEdge[] = [
    { follower: 'User_A', following: 'User_B' },
    { follower: 'User_B', following: 'User_C' },
    { follower: 'User_A', following: 'User_D' },
    { follower: 'User_D', following: 'User_C' },
  ];

  // Map intersections
  const targetUser = 'User_A';
  const mutualFollowings = new Map<string, number>();

  const explicitFollows = new Set(
    edgeMatrix.filter((e) => e.follower === targetUser).map((e) => e.following)
  );

  edgeMatrix.forEach((edge) => {
    if (explicitFollows.has(edge.follower)) {
      if (edge.following !== targetUser && !explicitFollows.has(edge.following)) {
        mutualFollowings.set(edge.following, (mutualFollowings.get(edge.following) || 0) + 1);
      }
    }
  });

  // Top recommendation candidate should be User_C due to multiple paths of graph closure
  expect(mutualFollowings.get('User_C')).toEqual(2);
});
