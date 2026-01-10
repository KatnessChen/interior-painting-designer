import React from 'react';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const { Title } = Typography;

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Title level={1} className="text-6xl mb-2">
        404
      </Title>
      <Title level={3} className="text-gray-600 mb-6">
        Page Not Found
      </Title>
      <Button type="primary" size="large" onClick={() => navigate(ROUTES.HOME)}>
        Back to Home
      </Button>
    </div>
  );
};

export default NotFoundPage;
