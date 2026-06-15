import React, { FC } from 'react'
import AdminSingletonPage from '../../admin/AdminSingletonPage'
import { validationExceptionsResource } from '../../admin/validationExceptionsResource'

const ValidationExceptionsPage: FC = () => (
    <AdminSingletonPage resource={validationExceptionsResource} />
)

export default ValidationExceptionsPage
