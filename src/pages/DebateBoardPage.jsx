import React from 'react';
import { useParams } from 'react-router-dom';
import DebateBoardView from '../components/DebateBoardView';

export default function DebateBoardPage() {
  const { boardId } = useParams();
  return <DebateBoardView boardId={boardId} />;
}
