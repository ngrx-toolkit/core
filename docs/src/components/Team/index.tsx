import React from 'react';
import styles from './styles.module.css';

interface TeamMember {
  name: string;
  image: string;
  description: string;
}

const teamMembers: TeamMember[] = [
  { 
    name: 'Manfred Steyer', 
    image: '/img/team/manfred-steyer.jpg',
    description: 'Trainer, consultant, and programming architect with a focus on Angular, Google Developer Expert (GDE) who writes for O\'Reilly, the German Java Magazine, and windows.developer. Regularly speaks at conferences.'
  },
  { 
    name: 'Rainer Hahnekamp', 
    image: '/img/team/rainer-hahnekamp.jpg',
    description: 'Google Developer Expert (GDE) and member of the NgRx team, focused on Angular, AI engineering, and agentic applications. Runs ng-news, a weekly Angular newsletter.'
  },
  { 
    name: 'Michael Small', 
    image: '/img/team/michael-small.jpg',
    description: 'Angular nerd. Answers questions on both of the Angular subreddits. Dabbling in open source discussions and contributions. Looking to get more involved in the community than before.'
  },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Team(): React.JSX.Element {
  const [shuffledTeam, setShuffledTeam] = React.useState<TeamMember[]>(() => 
    shuffleArray(teamMembers)
  );
  const [expandedMember, setExpandedMember] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Re-shuffle when component mounts
    setShuffledTeam(shuffleArray(teamMembers));
  }, []);

  const handleMemberClick = (memberName: string) => {
    setExpandedMember(expandedMember === memberName ? null : memberName);
  };

  return (
    <section className={styles.teamSection}>
      <div className={styles.teamGrid}>
        {shuffledTeam.map((member) => (
          <div 
            key={member.name} 
            className={`${styles.teamMember} ${expandedMember === member.name ? styles.expanded : ''}`}
            onClick={() => handleMemberClick(member.name)}
          >
            <div className={styles.memberAvatar}>
              <img 
                src={member.image} 
                alt={`${member.name} profile photo`}
                className={styles.profileImage}
              />
            </div>
            <h3 className={styles.memberName}>{member.name}</h3>
            {expandedMember === member.name && (
              <p className={styles.memberDescription}>{member.description}</p>
            )}
            <div className={styles.expandIndicator}>
              {expandedMember === member.name ? '−' : '+'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
