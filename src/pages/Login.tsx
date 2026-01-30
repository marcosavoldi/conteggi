import { Button, Center, Container, Paper, Text, Title } from '@mantine/core';
import { LogIn } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
    const { user, signIn } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper shadow="md" p="xl" radius="md" withBorder style={{ width: '100%' }}>
                <Center mb="md">
                    <Text size="xl" style={{ fontSize: '3rem' }}>🐝</Text>
                </Center>
                <Title order={2} ta="center" mb="xs" c="blue">
                    Gestione Interventi
                </Title>
                <Text ta="center" c="dimmed" mb="xl" size="sm">
                    Accedi per gestire i tuoi interventi
                </Text>

                <Button fullWidth onClick={signIn} leftSection={<LogIn size={20} />} size="md">
                    Accedi con Google
                </Button>
            </Paper>
        </Container>
    );
};
